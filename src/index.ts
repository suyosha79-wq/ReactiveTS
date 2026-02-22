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
// Batcher
export { useBatch } from "./core/scheduler";

// Disposables and Watcher
export type { Unsubscribe, IDisposable } from "./core/disposable";
export { ReactiveWatcher } from "./core/disposable";

// Listeners and Reactive Event
export type { ReactiveListener, ReactiveListenerOptions, ReactiveListenerContext } from "./core/event";
export { ReactiveEvent } from "./core/event";

// Reactive Field
export type { ReactiveCompare, ReactiveFieldOptions } from "./core/field";
export { ReactiveField } from "./core/field";

// History Stack
export { ReactiveHistoryStack, useReactiveTransaction } from "./core/history";

export type { Patch, Path, PathSpec } from "./core/patch";
export { pathToString } from "./core/patch";

// Computed, Select and Effect
export { useComputed, useSelect, ReactiveComputed } from "./core/computed";
export { useEffect } from "./core/effect";

// Converters
export { toPromise, toPromiseField, fromEvent, fromObservable } from "./core/adapters";

// Filters, Mapping and Sorting
export { useFiltered, useMapped, useSorted } from "./core/views";

// Objects and Arrays
export type { ReactiveObjectOptions } from "./reactive/object";
export { ReactiveObject } from "./reactive/object";

export type { ReactiveArrayOptions } from "./reactive/array";
export { ReactiveArray } from "./reactive/array";

// Transactions: middleware, profiler
export type { TransactionContext, TransactionMiddleware, TransactionProfile } from "./core/transaction";
export { ReactiveTransactionManager, createTransactionProfiler } from "./core/transaction";

// Snapshot API
export type { Snapshot, SnapshotSource } from "./core/snapshot";
export { createSnapshot, restoreSnapshot } from "./core/snapshot";

// Sync helpers
export { useSync, useOneWaySync } from "./core/sync";

// Lens & Atom
export { ReactiveAtom, useAtom } from "./core/atom";
export type { ReactiveLensSource } from "./core/lens";
export { useLens } from "./core/lens";

// Worker bridge
export type { WorkerBridge, WorkerMessage } from "./core/worker";
export { createWorkerBridge } from "./core/worker";

// DevTools
export type { DevToolsRecord } from "./core/devtools";
export { ReactiveDevTools } from "./core/devtools";