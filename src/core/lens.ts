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
import { ReactiveField } from "./field";
import type { Unsubscribe } from "./disposable";

/**
 * Reactive Lens Source
 */
export type ReactiveLensSource<T> = {
    value: T;                                       // Current Value
    addListener(fn: () => void): Unsubscribe;       // Add Lens Listener
};

/**
 * Get at Path
 * @param obj Object
 * @param path Path
 */
function getAtPath(obj: unknown, path: Array<string | number | symbol>): unknown {
    let cursor = obj as any;
    for (const seg of path) {
        cursor = cursor?.[seg as any];
    }
    return cursor;
}

/**
 * Set as Path
 * @param obj Object
 * @param path Path
 * @param next Next Iterator
 */
function setAtPath(obj: unknown, path: Array<string | number | symbol>, next: unknown): void {
    if (path.length === 0) return;
    let cursor = obj as any;
    for (let i = 0; i < path.length - 1; i++) {
        cursor = cursor[path[i] as any];
    }
    cursor[path[path.length - 1] as any] = next;
}

/**
 * Focus reactive source into nested value (two-way lens)
 */
export function useLens<TRoot extends object, TValue>(
    source: ReactiveLensSource<TRoot>,
    path: Array<string | number | symbol>
): ReactiveField<TValue> {
    // Reactive Field
    const lens = new ReactiveField<TValue>(getAtPath(source.value, path) as TValue);

    /**
     * Add Listener
     */
    source.addListener(() => {
        const next = getAtPath(source.value, path) as TValue;
        lens.set(next);
    });

    /**
     * Add Lens Listener
     */
    lens.addListener((next) => {
        const current = getAtPath(source.value, path);
        if (Object.is(current, next)) return;
        setAtPath(source.value, path, next);
    });

    return lens;
}
