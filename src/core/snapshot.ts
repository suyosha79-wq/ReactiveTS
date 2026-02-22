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
/**
 * Snapshot
 */
export type Snapshot<T> = {
    readonly createdAt: number;
    readonly value: T;
};

/**
 * Snapshot Source
 */
export type SnapshotSource<T> = {
    value: T;
};

/**
 * Clone Value
 * @param value Value for Clone
 */
function cloneValue<T>(value: T): T {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Capture immutable copy of reactive value
 */
export function createSnapshot<T>(source: SnapshotSource<T>): Snapshot<T> {
    return {
        createdAt: Date.now(),
        value: cloneValue(source.value)
    };
}

/**
 * Restore source value from snapshot
 */
export function restoreSnapshot<T>(source: SnapshotSource<T>, snapshot: Snapshot<T>): void {
    const next = cloneValue(snapshot.value);
    if (Array.isArray(source.value) && Array.isArray(next)) {
        (source.value as unknown as unknown[]).splice(0, (source.value as unknown as unknown[]).length, ...next as unknown[]);
        return;
    }

    if (source.value && typeof source.value === "object" && next && typeof next === "object") {
        const target = source.value as Record<PropertyKey, unknown>;
        for (const key of Reflect.ownKeys(target)) {
            delete target[key];
        }
        for (const key of Reflect.ownKeys(next as object)) {
            target[key] = (next as Record<PropertyKey, unknown>)[key];
        }
        return;
    }

    (source as { value: T }).value = next;
}
