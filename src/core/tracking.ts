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
import { Unsubscribe } from "./disposable";

/**
 * Dependency Type
 */
export type Dep = {
    subscribe(onInvalidate: () => void): Unsubscribe;
};

/**
 * Dependency Tracking Type
 */
type Tracker = {
    /**
     * Add Dependency
     * @param dep {Dep} Dependency Track
     */
    addDependency(dep: Dep): void;
};

// Define Tracking Stack
const stack : Tracker[] = [];

/**
 * Begin Reactive Dependency Tracking
 * @param tracker
 */
export function beginTracking(tracker: Tracker): void {
    stack.push(tracker);
}

/**
 * End Reactive Dependency Tracking
 */
export function endTracking(): void {
    stack.pop();
}

/**
 * Use Tracking for Computed
 * @param dep {Dep} Dependency
 */
export function useTracking(dep: Dep): void {
    const t = stack[stack.length - 1];
    if (!t) return;
    t.addDependency(dep);
}