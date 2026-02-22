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
import { ReactiveEvent, type ReactiveListenerOptions } from "../core/event";
import type { Unsubscribe } from "../core/disposable";
import type { Patch, Path, PathSpec } from "../core/patch";
import { ReactiveHistoryStack } from "../core/history";
import { useBatch } from "../core/scheduler";
import { ReactiveField } from "../core/field";
import { parsePathSpec, patchPathToSegments, matchPath } from "../core/patch";
import { useTracking } from "../core/tracking";

/**
 * Reactive Object Options
 */
export type ReactiveObjectOptions = {
    history?: ReactiveHistoryStack;
};

/**
 * Path Listener Options
 */
export type PathListenerOptions = ReactiveListenerOptions & {
    mode?: "exact" | "prefix";
};

export class ReactiveObject<ReactiveData extends object> {
    // Reactive Changes and History with Root
    private readonly changes = new ReactiveEvent<Patch>();
    private readonly history?: ReactiveHistoryStack;
    private readonly root: ReactiveData;

    // Proxy Caching
    private readonly proxyCache = new WeakMap<object, any>();
    private readonly proxy: ReactiveData;

    // Version
    private readonly version = new ReactiveField<number>(0);

    /**
     * Reactive Object
     * @param obj Reactive Data
     * @param options {ReactiveObjectOptions} Object Options
     */
    constructor(obj: ReactiveData, options: ReactiveObjectOptions = {}) {
        this.root = obj;
        this.history = options.history;
        this.proxy = this.makeProxy(obj, []);
    }

    /**
     * Current Reactive Object Value
     */
    public get value(): ReactiveData {
        // dependency tracking for computed/effect:
        useTracking(() => this.version.addListener(() => {}));
        // read version to participate in tracking when using select/computed
        void this.version.value;
        return this.proxy;
    }

    /**
     * Add Reactive Listener
     * @param fn {Function} Reactive Listener
     * @param options {ReactiveListenerOptions} Listener Options
     */
    public addListener(fn: (patch: Patch) => void | Promise<void>, options?: ReactiveListenerOptions): Unsubscribe {
        return this.changes.addListener(fn, options);
    }

    /**
     * Add Reactive Listener for Object Path
     * @param spec {PathSpec} Path
     * @param fn {Function} Reactive Listener
     * @param options {PathListenerOptions} Listener Options
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
     * Bump Current Object Version
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
        const target = this.getTargetByPath(this.root, patch.path.slice(0, -1));
        const key = patch.path[patch.path.length - 1] as any;

        if (patch.op === "set") {
            (target as any)[key] = patch.next;
        } else if (patch.op === "delete") {
            delete (target as any)[key];
        } else if (patch.op === "splice") {
            const arr = this.getTargetByPath(this.root, patch.path) as any[];
            arr.splice(patch.index, patch.deleteCount, ...patch.items);
        }
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
            undo: () => useBatch(() => { this.applyPatch(inverse); this.invokePatch(inverse); }),
            redo: () => useBatch(() => { this.applyPatch(patch); this.invokePatch(patch); })
        });
    }

    /**
     * Get Target by Path
     * @param obj Object
     * @param path {Path} Path to Target
     * @private
     */
    private getTargetByPath(obj: any, path: Path): any {
        let cur = obj;
        for (const p of path) cur = cur[p as any];
        return cur;
    }

    /**
     * Make Proxy
     * @param obj Object
     * @param basePath {Path} Base Path
     * @private
     */
    private makeProxy(obj: any, basePath: Path): any {
        if (obj && typeof obj === "object") {
            const cached = this.proxyCache.get(obj);
            if (cached) return cached;
        }

        const self = this;

        const proxy = new Proxy(obj, {
            get(target, prop, receiver) {
                const v = Reflect.get(target, prop, receiver);
                if (v && typeof v === "object") {
                    return self.makeProxy(v, basePath.concat(prop));
                }
                return v;
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
        });

        if (obj && typeof obj === "object") {
            this.proxyCache.set(obj, proxy);
        }
        return proxy;
    }
}