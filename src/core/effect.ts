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
import { beginTracking, endTracking } from "./tracking";
import type { Unsubscribe } from "./disposable";

// For Dependency Checking
type DepSub = () => Unsubscribe;

// Effect Cleanup Functions
export type ReactiveEffectCleanup = void | (() => void);
export type ReactiveEffectFn = () => ReactiveEffectCleanup;

/**
 * Effect Options
 */
export type ReactiveEffectOptions = {
    lazy?: boolean;
};

/**
 * Use Reactive Effect
 * @param fn {ReactiveEffectFn} Reactive Effect Function
 * @param options {ReactiveEffectOptions} Effect Options
 * @return {Unsubscribe} Unsubscribe Method
 */
export function useEffect(fn: ReactiveEffectFn, options: ReactiveEffectOptions = {}): Unsubscribe {
    // Internal Parameters
    let cleanup: (() => void) | undefined;
    let depUnsubs: Unsubscribe[] = [];
    let deps = new Set<DepSub>();
    let stopped = false;

    // Run Effect
    const run = () => {
        if (stopped) return;

        // cleanup
        if (cleanup) {
            try { cleanup(); } catch {}
            cleanup = undefined;
        }

        // unsub deps
        for (const u of depUnsubs) {
            try { u(); } catch {}
        }
        depUnsubs = [];
        deps.clear();

        const tracker = {
            addDependency: (subFactory: DepSub) => deps.add(subFactory)
        };

        beginTracking(tracker);
        try {
            const c = fn();
            if (typeof c === "function") cleanup = c;
        } finally {
            endTracking();
        }

        for (const dep of deps) {
            depUnsubs.push(dep());
        }
    };

    // If Lazy Option Enabled
    if (!options.lazy) run();

    return () => {
        stopped = true;
        if (cleanup) {
            try { cleanup(); } catch {}
            cleanup = undefined;
        }
        for (const u of depUnsubs) {
            try { u(); } catch {}
        }
        depUnsubs = [];
        deps.clear();
    };
}