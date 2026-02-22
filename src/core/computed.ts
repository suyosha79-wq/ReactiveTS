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
import { beginTracking, endTracking } from "./tracking";
import type { Unsubscribe } from "./disposable";

// For Dependency Unsubscribe
type DepSub = () => Unsubscribe;

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
    // Computed Data
    private readonly compute: () => T;
    private deps = new Set<DepSub>();
    private depUnsubs: Unsubscribe[] = [];
    private dirty = true;
    private readonly equalsLocal: ReactiveCompare<T>;
    private readonly lazy: boolean;

    /**
     * Create Compute
     * @param compute {Function} Compute Method
     * @param options {ComputedOptions} Compute Options
     */
    constructor(compute: () => T, options: ComputedOptions<T> = {}) {
        // Will be replaced at first computeNow()
        super(undefined as unknown as T, { equals: options.equals ?? Object.is });
        this.compute = compute;
        this.equalsLocal = options.equals ?? Object.is;
        this.lazy = options.lazy ?? false;

        if (!this.lazy) {
            this.computeNow();
        }
    }

    /**
     * Get Current Value
     */
    public override get value(): T {
        if (this.dirty) this.computeNow();
        return super.value;
    }

    /**
     * Dispose
     */
    public dispose(): void {
        for (const u of this.depUnsubs) {
            try { u(); } catch {}
        }
        this.depUnsubs = [];
        this.deps.clear();
    }

    /**
     * Compute Now
     * @private
     */
    private computeNow(): void {
        // unsubscribe previous deps
        for (const u of this.depUnsubs) {
            try { u(); } catch {}
        }
        this.depUnsubs = [];
        this.deps.clear();

        const tracker = {
            addDependency: (subFactory: DepSub) => {
                this.deps.add(subFactory);
            }
        };

        beginTracking(tracker);
        let next!: T;
        try {
            next = this.compute();
        } finally {
            endTracking();
        }

        // subscribe to deps with recompute invalidation
        for (const dep of this.deps) {
            const unsub = dep();
            this.depUnsubs.push(unsub);
        }

        this.dirty = false;

        // set only if changed
        const prev = super.value;
        if (!this.equalsLocal(prev, next)) {
            super.set(next);
        } else {
            // keep stable value
            // still ensure internal _value is correct (it is)
        }
    }

    /**
     * Helper to create dependency subscriptions from any ReactiveField/Event.
     */
    static trackField<T>(field: ReactiveField<T>, onChange: () => void): DepSub {
        return () => field.addListener(() => onChange());
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