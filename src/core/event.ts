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
import { useSchedule } from "./scheduler";

/**
 * Reactive Listener Options
 */
export type ReactiveListenerOptions = {
    signal?: AbortSignal;               // For Async Operations
    batched?: boolean;                  // default true for batching
};

/**
 * Reactive Listener Context
 */
export type ReactiveListenerContext = {
    signal: AbortSignal;
};

/**
 * Reactive Listener
 */
export type ReactiveListener<ReactiveData> = (payload: ReactiveData, ctx: ReactiveListenerContext) => void | Promise<void>;

/**
 * Stored Reactive Listener
 */
type StoredReactiveListener<ReactiveData> = {
    fn: ReactiveListener<ReactiveData>;             // Listener Function
    batched: boolean;                               // Batching Option
    controller: AbortController;                    // Async Abort Controller
    externalAbortUnsub?: () => void;                // External Abort Unsubscribe Method
};

/**
 * Reactive Types Base
 */
export interface IReactiveTypeBase<ReactiveData> {
    get listenerCount() : number;
    addListener(fn: ReactiveListener<ReactiveData>, options: ReactiveListenerOptions): Unsubscribe;
    removeListener(fn: ReactiveListener<ReactiveData>): void;
    removeAllListeners(): void;
    invokeOnce(fn: ReactiveListener<ReactiveData>, options: ReactiveListenerOptions): Unsubscribe;
}

/**
 * Reactive Event
 */
export class ReactiveEvent<ReactiveData = void> implements IReactiveTypeBase<ReactiveData> {
    // Reactive Listeners
    private listeners : Set<StoredReactiveListener<ReactiveData>> = new Set<StoredReactiveListener<ReactiveData>>();

    /**
     * @return {number} Reactive Listeners Count
     */
    get listenerCount(): number {
        return this.listeners.size;
    }

    /**
     * Add Reactive Listener
     * @param fn {ReactiveListener} Reactive Listener
     * @param options {ReactiveListenerOptions} Listener Options
     * @return {Unsubscribe} Unsubscribe Method
     */
    public addListener(fn: ReactiveListener<ReactiveData>, options: ReactiveListenerOptions = {}): Unsubscribe {
        // Create Stored Listener
        const stored: StoredReactiveListener<ReactiveData> = {
            fn,
            batched: options.batched ?? true,
            controller: new AbortController()
        };

        // For Async Operations
        if (options.signal) {
            if (options.signal.aborted) return () => {};
            const onAbort = () => this.removeListener(fn);
            options.signal.addEventListener("abort", onAbort, { once: true });
            stored.externalAbortUnsub = () => options.signal?.removeEventListener("abort", onAbort);
        }

        // Add Listener
        this.listeners.add(stored);

        // Return Unsubscribe Method
        return () => {
            this.listeners.delete(stored);
            stored.externalAbortUnsub?.();
            stored.controller.abort();
        };
    }

    /**
     * Remove Reactive Listener
     * @param fn {ReactiveListener} Reactive Listener
     */
    public removeListener(fn: ReactiveListener<ReactiveData>): void {
        for (const l of this.listeners) {
            if (l.fn === fn) {
                this.listeners.delete(l);
                l.externalAbortUnsub?.();
                l.controller.abort();
            }
        }
    }

    /**
     * Remove All Reactive Listeners
     */
    public removeAllListeners(): void {
        for (const l of this.listeners) {
            l.externalAbortUnsub?.();
            l.controller.abort();
        }
        this.listeners.clear();
    }

    /**
     * Invoke Listener Once and Dispose
     * @param fn {ReactiveListener} Reactive Listener
     * @param options {ReactiveListenerOptions} Listener Options
     * @return {Unsubscribe} Unsubscribe Function
     */
    public invokeOnce(fn: ReactiveListener<ReactiveData>, options: ReactiveListenerOptions = {}): Unsubscribe {
        let unsub: Unsubscribe = () => {};
        const wrapper: ReactiveListener<ReactiveData> = async (p, ctx) => {
            unsub();
            await fn(p, ctx);
        };
        unsub = this.addListener(wrapper, options);
        return unsub;
    }

    /**
     * Invoke Reactive Event Sync
     * @param payload Reactive Event Data
     */
    public invoke(payload: ReactiveData): void {
        for (const l of Array.from(this.listeners)) {
            const run = () => {
                if (l.controller.signal.aborted) return;
                try {
                    const res = l.fn(payload, { signal: l.controller.signal });
                    if (res && typeof (res as Promise<void>).then === "function") {
                        (res as Promise<void>).catch(() => {});
                    }
                } catch {
                    // ignore
                }
            };

            if (l.batched) useSchedule(run);
            else run();
        }
    }

    /**
     * Invoke Reactive Event Async
     * @param payload Reactive Event Data
     * @param signal {AbortSignal} Cancellation Signal
     * @return {Promise}
     */
    public async invokeAsync(payload: ReactiveData, signal?: AbortSignal): Promise<void> {
        const tasks: Promise<void>[] = [];

        for (const l of Array.from(this.listeners)) {
            if (signal?.aborted) break;

            const run = async () => {
                if (l.controller.signal.aborted) return;
                if (signal?.aborted) return;

                let off: (() => void) | undefined;
                if (signal) {
                    const onAbort = () => l.controller.abort();
                    signal.addEventListener("abort", onAbort, { once: true });
                    off = () => signal.removeEventListener("abort", onAbort);
                }

                try {
                    await l.fn(payload, { signal: l.controller.signal });
                } catch {
                    // ignore
                } finally {
                    off?.();
                }
            };

            tasks.push(l.batched ? new Promise<void>((r) => useSchedule(() => void run().finally(r))) : run());
        }

        await Promise.all(tasks);
    }
}