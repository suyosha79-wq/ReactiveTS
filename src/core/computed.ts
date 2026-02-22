/**
 * ReactiveTS Library
 * A simple and lightweight reactive extensions library for typescript projects
 * Contains Reactive Fields, Arrays and Objects with async support, history mode
 * and effectors.
 *
 * @developer       Elijah Rastorguev
 * @version         0.9.5
 * @author          Neurosell
 * @modified        21.02.2025
 * @github          https://github.com/Neurosell/ReactiveTS/
 */
// Import Required
import { ReactiveField, type ReactiveCompare } from "./field";
import { beginTracking, endTracking, type Dep } from "./tracking";
import type { Unsubscribe } from "./disposable";
import { useSchedule } from "./scheduler";

/**
 * Computed Options
 */
export type ComputedOptions<T> = {
    equals?: ReactiveCompare<T>;                // Compare Method
    lazy?: boolean;                             // If true - enable lazy compute upon reading. By default false - batching
};

/**
 * Computed Class for Dependency Collection for any Reactive Types
 */
export class ReactiveComputed<T> extends ReactiveField<T> {
    // Compute and Equals Parameters
    private readonly computeFn: () => T;
    private readonly equalsLocal: ReactiveCompare<T>;
    private readonly lazy: boolean;

    // Depedency
    private depUnsubs: Unsubscribe[] = [];
    private deps: Dep[] = [];

    private dirty = true;
    private scheduled = false;
    private disposed = false;
    private computing = false;

    constructor(fn: () => T, options: ComputedOptions<T> = {}) {
        // initial value will be computed
        super(undefined as unknown as T, { equals: options.equals ?? Object.is });

        this.computeFn = fn;
        this.equalsLocal = options.equals ?? Object.is;
        this.lazy = options.lazy ?? false;

        if (!this.lazy) {
            this.recomputeNow();
        }
    }

    override get value(): T {
        if (this.disposed) return super.value;
        if (this.dirty) this.recomputeNow();
        return super.value;
    }

    /**
     * Stop listening to dependencies (useful to prevent leaks in long-lived graphs).
     */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.unsubscribeDeps();
        // optionally you can remove listeners from this computed itself:
        // this.removeAllListeners();
    }

    /**
     * Inspect current computed dependencies snapshot.
     */
    public inspectDependencies(): readonly Dep[] {
        return this.deps;
    }

    private unsubscribeDeps(): void {
        for (const u of this.depUnsubs) {
            try { u(); } catch {}
        }
        this.depUnsubs = [];
        this.deps = [];
    }

    private invalidate = (): void => {
        if (this.disposed) return;

        // mark dirty
        this.dirty = true;

        // lazy computed won't auto recompute
        if (this.lazy) return;

        // avoid scheduling multiple times
        if (this.scheduled) return;
        this.scheduled = true;

        useSchedule(() => {
            this.scheduled = false;
            if (this.disposed) return;
            if (this.dirty) this.recomputeNow();
        });
    };

    private recomputeNow(): void {
        if (this.disposed) return;

        // Prevent re-entrant recompute loops (can happen with weird circular graphs)
        if (this.computing) return;
        this.computing = true;

        // Tear down old deps first (so dependency set can change freely)
        this.unsubscribeDeps();

        const nextDeps: Dep[] = [];
        const tracker = {
            addDependency: (dep: Dep) => {
                // dedupe deps by identity (dep object should be stable per source read)
                // if you create new dep objects each read, consider interning them in source.
                if (!nextDeps.includes(dep)) nextDeps.push(dep);
            }
        };

        beginTracking(tracker);

        let nextValue!: T;
        try {
            nextValue = this.computeFn();
        } finally {
            endTracking();
        }

        // Subscribe to new deps using invalidate callback
        this.deps = nextDeps;
        this.depUnsubs = nextDeps.map((d) => d.subscribe(this.invalidate));

        this.dirty = false;

        // Only publish if changed
        const prevValue = super.value;
        if (!this.equalsLocal(prevValue, nextValue)) {
            super.set(nextValue);
        }

        this.computing = false;
    }
}

/**
 * Compute Function
 */
export function useComputed<T>(fn: () => T, options?: ComputedOptions<T>): ReactiveComputed<T> {
    return new ReactiveComputed(fn, options);
}

/**
 * Selector Method
 * @param source {ReactiveField} Source Field
 * @param map Map Function
 * @param options Selector Options
 */
export function useSelect<A, B>(
    source: ReactiveField<A>,
    map: (a: A) => B,
    options?: { equals?: ReactiveCompare<B>; lazy?: boolean }
): ReactiveComputed<B> {
    return useComputed(() => map(source.value), options);
}