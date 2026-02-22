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
import {beginTracking, Dep, endTracking} from "./tracking";
import type {Unsubscribe} from "./disposable";
import {useSchedule} from "./scheduler";

// Effect Cleanup Functions
export type ReactiveEffectCleanup = void | (() => void);
export type ReactiveEffectFn = () => ReactiveEffectCleanup;

/**
 * Effect Options
 */
export type ReactiveEffectOptions = {
    defer?: boolean;
    lazy?: boolean;
    flush?: "microtask" | "sync";
    flushOnStop?: boolean;
};

/**
 * Reactive Effect Handle
 */
export type ReactiveEffectHandle = Unsubscribe & {
    run(): void;
    flush(): void;
};

/**
 * Use Reactive Effect
 * @param fn {ReactiveEffectFn} Reactive Effect Function
 * @param options {ReactiveEffectOptions} Effect Options
 * @return {Unsubscribe} Unsubscribe Method
 */
export function useEffect(fn: ReactiveEffectFn, options: ReactiveEffectOptions = {}): Unsubscribe {
    const flushMode = options.flush ?? "microtask";

    let cleanup: (() => void) | undefined;
    let depUnsubs: Unsubscribe[] = [];

    let stopped = false;
    let scheduled = false;
    let running = false;

    const unsubscribeDeps = () => {
        for (const u of depUnsubs) {
            try { u(); } catch {}
        }
        depUnsubs = [];
    };

    const run = () => {
        if (stopped) return;

        // guard against re-entrancy loops
        if (running) return;
        running = true;

        try {
            // cleanup previous
            if (cleanup) {
                try { cleanup(); } catch {}
                cleanup = undefined;
            }

            // rebuild deps
            unsubscribeDeps();

            const nextDeps: Dep[] = [];
            const tracker = {
                addDependency: (dep: Dep) => {
                    if (!nextDeps.includes(dep)) nextDeps.push(dep);
                }
            };

            beginTracking(tracker);
            try {
                const c = fn();
                if (typeof c === "function") cleanup = c;
            } finally {
                endTracking();
            }

            // subscribe deps
            depUnsubs = nextDeps.map((d) => d.subscribe(invalidate));
        } finally {
            running = false;
        }
    };

    const invalidate = () => {
        if (stopped) return;
        if (options.lazy) return;

        if (flushMode === "sync") {
            run();
            return;
        }

        // microtask mode (default): coalesce many invalidations to one run
        if (scheduled) return;
        scheduled = true;
        useSchedule(() => {
            scheduled = false;
            run();
        });
    };

    const flush = () => {
        if (stopped) return;
        if (!scheduled) return;
        scheduled = false;
        run();
    };

    // initial run
    if (!options.lazy) {
        if (options.defer) useSchedule(run);
        else run();
    }

    return Object.assign(
        () => {
            if (stopped) return;

            if (options.flushOnStop) {
                // если есть pending run — догоним его перед остановкой
                flush();
            }

            stopped = true;

            if (cleanup) {
                try { cleanup(); } catch {}
                cleanup = undefined;
            }

            unsubscribeDeps();
        },
        { run, flush }
    );
}