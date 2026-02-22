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
import { useComputed, type ReactiveComputed } from "./computed";
import type { ReactiveCompare } from "./field";
import { ReactiveArray } from "../reactive/array";

/**
 * Use Filtered (React on Array Changes via Version Tracking Array)
 * @param list {ReactiveArray} Reactive Array
 * @param predicate {Function} Predicate Method
 */
export function useFiltered<T>(list: ReactiveArray<T>, predicate: (x: T, i: number) => boolean): ReactiveComputed<T[]> {
    return useComputed(() => list.value.filter(predicate));
}

/**
 * Get Mapped
 * @param list {ReactiveArray} Reactive Array
 * @param map {Function} Map
 */
export function useMapped<T, R>(list: ReactiveArray<T>, map: (x: T, i: number) => R): ReactiveComputed<R[]> {
    return useComputed(() => list.value.map(map));
}

/**
 * Use Sorted
 * @param list {ReactiveArray} Reactive Array
 * @param compareFn {Function} Compare Function
 * @param options Options
 */
export function useSorted<T>(
    list: ReactiveArray<T>,
    compareFn: (a: T, b: T) => number,
    options?: { equals?: ReactiveCompare<T[]> }
): ReactiveComputed<T[]> {
    return useComputed(() => [...list.value].sort(compareFn), options);
}