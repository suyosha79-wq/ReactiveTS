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
import { ReactiveEvent, type ReactiveListenerOptions } from "../core/event";
import type { Unsubscribe } from "../core/disposable";
import type { Patch, Path, PathSpec } from "../core/patch";
import { ReactiveHistoryStack } from "../core/history";
import { useBatch } from "../core/scheduler";
import { ReactiveField } from "../core/field";
import { parsePathSpec, patchPathToSegments, matchPath } from "../core/patch";
import { useTracking } from "../core/tracking";

/**
 * Reactive Array Options
 */
export type ReactiveArrayOptions = {
    history?: ReactiveHistoryStack;
};

/**
 * Path Listener Options
 */
export type PathListenerOptions = ReactiveListenerOptions & {
    mode?: "exact" | "prefix";
};

/**
 * Reactive Array
 */
export class ReactiveArray<T> {
    // Changes, History And Root
    private readonly changes = new ReactiveEvent<Patch>();
    private readonly history?: ReactiveHistoryStack;
    private readonly root: T[];
    private readonly proxy: T[];

    // Version
    private readonly version = new ReactiveField<number>(0);

    /**
     * Create Reactive Array
     * @param arr {Array} Array
     * @param options {ReactiveArrayOptions} Options
     */
    constructor(arr: T[] = [], options: ReactiveArrayOptions = {}) {
        this.root = arr;
        this.history = options.history;
        this.proxy = this.makeProxy(arr, []);
    }

    /**
     * Get Current Reactive Array Value
     */
    public get value(): T[] {
        useTracking({
            subscribe: (onInvalidate) => this.version.addListener(() => onInvalidate(), { batched: false })
        });
        void this.version.value;
        return this.proxy;
    }

    /**
     * Add Reactive Listener
     * @param fn {Function} Listener
     * @param options {ReactiveListenerOptions} Options
     */
    public addListener(fn: (patch: Patch) => void | Promise<void>, options?: ReactiveListenerOptions): Unsubscribe {
        return this.changes.addListener(fn, options);
    }

    /**
     * Add Reactive Listener for Path
     * @param spec {PathSpec} Path
     * @param fn {Function} Listener
     * @param options {PathListenerOptions} Options
     */
    public addPathListener(spec: PathSpec, fn: (patch: Patch) => void | Promise<void>, options: PathListenerOptions = {}): Unsubscribe {
        const specSegs = parsePathSpec(spec);
        const mode = options.mode ?? "prefix";
        return this.changes.addListener((patch) => {
            const segs = patchPathToSegments(patch.path);
            if (matchPath(specSegs, segs, mode)) return fn(patch);
        }, options);
    }

    /**
     * Remove All Listeners
     */
    public removeAllListeners(): void {
        this.changes.removeAllListeners();
    }

    /**
     * Bump Array Version
     * @private
     */
    private bumpVersion(): void {
        this.version.update((v) => v + 1);
    }

    /**
     * Invoke Patch
     * @param patch {Patch} Patch Options
     * @private
     */
    private invokePatch(patch: Patch): void {
        this.bumpVersion();
        this.changes.invoke(patch);
    }

    /**
     * Apply Patch
     * @param patch {Patch} Patch Options
     * @private
     */
    private applyPatch(patch: Patch): void {
        if (patch.op === "splice") {
            const arr = this.getTargetByPath(this.root, patch.path) as any[];
            arr.splice(patch.index, patch.deleteCount, ...patch.items);
            return;
        }
        const target = this.getTargetByPath(this.root, patch.path.slice(0, -1));
        const key = patch.path[patch.path.length - 1] as any;

        if (patch.op === "set") (target as any)[key] = patch.next;
        else if (patch.op === "delete") delete (target as any)[key];
    }

    /**
     * Invert Patch
     * @param p {Patch} Patch Options
     * @private
     */
    private invertPatch(p: Patch): Patch {
        if (p.op === "set") return { op: "set", path: p.path, prev: p.next, next: p.prev };
        if (p.op === "delete") return { op: "set", path: p.path, prev: undefined, next: p.prev };
        return {
            op: "splice",
            path: p.path,
            index: p.index,
            deleteCount: p.items.length,
            items: p.removed,
            removed: p.items
        };
    }

    /**
     * Record History
     * @param patch {Patch} Patch Options
     * @private
     */
    private recordHistory(patch: Patch): void {
        const h = this.history;
        if (!h || h.isApplying) return;
        const inverse = this.invertPatch(patch);

        h.push({
            undo: () => useBatch(() => { this.applyPatch(inverse); this.invertPatch(inverse); }),
            redo: () => useBatch(() => { this.applyPatch(patch); this.invokePatch(patch); })
        });
    }

    /**
     * Get Target by Path
     * @param obj Object
     * @param path Path
     * @private
     */
    private getTargetByPath(obj: any, path: Path): any {
        let cur = obj;
        for (const p of path) cur = cur[p as any];
        return cur;
    }

    /**
     * Make Proxy
     * @param arr {Array} Array
     * @param basePath {Path} Base Path
     * @private
     */
    private makeProxy(arr: any[], basePath: Path): any[] {
        const self = this;

        const handler: ProxyHandler<any[]> = {
            get(target, prop, receiver) {
                if (prop === "push") {
                    return (...items: any[]) => {
                        const index = target.length;
                        const removed: any[] = [];
                        const patch: Patch = { op: "splice", path: basePath, index, deleteCount: 0, items, removed };
                        const res = target.push(...items);
                        self.recordHistory(patch);
                        self.invokePatch(patch);
                        return res;
                    };
                }
                if (prop === "pop") {
                    return () => {
                        if (target.length === 0) return undefined;
                        const index = target.length - 1;
                        const removed = [target[index]];
                        const patch: Patch = { op: "splice", path: basePath, index, deleteCount: 1, items: [], removed };
                        const res = target.pop();
                        self.recordHistory(patch);
                        self.invokePatch(patch);
                        return res;
                    };
                }
                if (prop === "splice") {
                    return (index: number, deleteCount?: number, ...items: any[]) => {
                        const dc = deleteCount ?? (target.length - index);
                        const removed = target.slice(index, index + dc);
                        const patch: Patch = { op: "splice", path: basePath, index, deleteCount: dc, items, removed };
                        const res = target.splice(index, dc, ...items);
                        self.recordHistory(patch);
                        self.invokePatch(patch);
                        return res;
                    };
                }

                return Reflect.get(target, prop, receiver);
            },

            set(target, prop, value, receiver) {
                const prev = Reflect.get(target, prop, receiver);
                if (Object.is(prev, value)) return true;
                const ok = Reflect.set(target, prop, value, receiver);
                if (!ok) return false;

                const patch: Patch = { op: "set", path: basePath.concat(prop), prev, next: value };
                self.recordHistory(patch);
                self.invokePatch(patch);
                return true;
            },

            deleteProperty(target, prop) {
                if (!Reflect.has(target, prop)) return true;
                const prev = (target as any)[prop];
                const ok = Reflect.deleteProperty(target, prop);
                if (!ok) return false;

                const patch: Patch = { op: "delete", path: basePath.concat(prop), prev };
                self.recordHistory(patch);
                self.invokePatch(patch);
                return true;
            }
        };

        return new Proxy(arr, handler);
    }
}