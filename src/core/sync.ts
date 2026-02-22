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
import type { Unsubscribe } from "./disposable";
import type { ReactiveField } from "./field";

/**
 * Syncable Type
 */
export type Syncable<T> = Pick<ReactiveField<T>, "value" | "addListener">;

/**
 * Two-way sync between two reactive fields
 */
export function useSync<T>(left: Syncable<T>, right: Syncable<T>): Unsubscribe {
    let lock = false;

    const leftUnsub = left.addListener((next) => {
        if (lock) return;
        lock = true;
        right.value = next;
        lock = false;
    }, { batched: false });

    const rightUnsub = right.addListener((next) => {
        if (lock) return;
        lock = true;
        left.value = next;
        lock = false;
    }, { batched: false });

    return () => {
        leftUnsub();
        rightUnsub();
    };
}

/**
 * One-way synchronization from source to target
 */
export function useOneWaySync<T>(source: Syncable<T>, target: Syncable<T>): Unsubscribe {
    return source.addListener((next) => {
        target.value = next;
    }, { batched: false });
}
