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
import { ReactiveField, type ReactiveFieldOptions } from "./field";

/**
 * Lightweight atom primitive based on ReactiveField.
 */
export class ReactiveAtom<T> extends ReactiveField<T> {}

/**
 * Create a new atom
 */
export function useAtom<T>(initial: T, options?: ReactiveFieldOptions<T>): ReactiveAtom<T> {
    return new ReactiveAtom(initial, options);
}