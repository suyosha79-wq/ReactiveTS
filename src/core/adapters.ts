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
import { ReactiveEvent } from "./event";
import { ReactiveField } from "./field";
import type { Unsubscribe } from "./disposable";

/**
 * To Promise Option
 */
export type ToPromiseOptions<T> = {
    predicate?: (v: T) => boolean;
    signal?: AbortSignal;
    timeoutMs?: number;
    immediate?: boolean;
};

/**
 * Convert to Promise
 * @param ev {ReactiveEvent} Reactive Event
 * @param options {ToPromiseOptions} Options
 * @return {Promise} Promise
 */
export function toPromise<T>(ev: ReactiveEvent<T>, options: ToPromiseOptions<T> = {}): Promise<T> {
    // Options
    const { predicate, signal, timeoutMs } = options;

    // Return Promise
    return new Promise<T>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        let timer: any;
        const cleanup = (unsub?: Unsubscribe) => {
            try { unsub?.(); } catch {}
            if (timer) clearTimeout(timer);
        };

        if (timeoutMs != null) {
            timer = setTimeout(() => {
                cleanup(unsub);
                reject(new Error(`toPromise timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        }

        const onAbort = () => {
            cleanup(unsub);
            reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });

        const unsub = ev.addListener((v) => {
            if (predicate && !predicate(v)) return;
            signal?.removeEventListener("abort", onAbort);
            cleanup(unsub);
            resolve(v);
        }, { signal });
    });
}

/**
 * To Promise Field
 * @param field {ReactiveField} Reactive Field
 * @param options {ToPromiseOptions} Options
 * @return {Promise<ReactiveField>} Promise Field
 */
export function toPromiseField<T>(field: ReactiveField<T>, options: ToPromiseOptions<T> = {}): Promise<T> {
    const { predicate, signal, timeoutMs, immediate } = options;

    if (immediate) {
        const v = field.value;
        if (!predicate || predicate(v)) return Promise.resolve(v);
    }

    const ev = new ReactiveEvent<T>();
    const unsub = field.addListener((v) => ev.invoke(v), { signal });

    return toPromise(ev, { predicate, signal, timeoutMs }).finally(() => {
        try { unsub(); } catch {}
    });
}

/**
 * Get From Event
 * @param target {EventTarget} Event Target
 * @param type {string} Event Type
 * @param options {AddEventListenerOptions} Event Listener Options
 */
export function fromEvent<T = Event>(
    target: EventTarget,
    type: string,
    options?: AddEventListenerOptions
): { event: ReactiveEvent<T>; dispose: Unsubscribe } {
    const event = new ReactiveEvent<T>();
    const handler = (e: Event) => event.invoke(e as T);
    target.addEventListener(type, handler, options);
    const dispose = () => target.removeEventListener(type, handler, options);
    return { event, dispose };
}

/**
 * Observable Like
 */
export type ObservableLike<T> = {
    // Subscribe
    subscribe(next: (v: T) => void, error?: (e: unknown) => void, complete?: () => void): Unsubscribe | { unsubscribe(): void };
};

/**
 * Convert from Observable
 * @param obs {ObservableLike} Observable Like
 */
export function fromObservable<T>(obs: ObservableLike<T>): { event: ReactiveEvent<T>; dispose: Unsubscribe } {
    const event = new ReactiveEvent<T>();

    const sub = obs.subscribe(
        (v) => event.invoke(v),
        () => {},
        () => {}
    );

    const dispose =
        typeof sub === "function"
            ? sub
            : () => {
                try { sub.unsubscribe(); } catch {}
            };

    return { event, dispose };
}