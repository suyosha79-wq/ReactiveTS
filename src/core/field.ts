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
import { ReactiveEvent, IReactiveTypeBase, type ReactiveListener, type ReactiveListenerOptions } from "./event";
import { ReactiveHistoryStack } from "./history";
import { useTracking } from "./tracking";

// Field Listener and Compare Methods
export type ReactiveFieldListener<T> = ReactiveListener<T>;
export type ReactiveCompare<T> = (a: T, b: T) => boolean;

/**
 * Reactive Field Options
 */
export type ReactiveFieldOptions<T> = {
    equals?: ReactiveCompare<T>;                                    // Equals Method
    history?: ReactiveHistoryStack;                                 // Reactive History Stack
    historyLabel?: (prev: T, next: T) => string | undefined;        // Reactive History Name
};

/**
 * Reactive Field
 */
export class ReactiveField<ReactiveData> implements IReactiveTypeBase<ReactiveData> {
    // Current Field Values and History
    private _value: ReactiveData;
    private readonly equals: ReactiveCompare<ReactiveData>;
    private readonly changed = new ReactiveEvent<ReactiveData>();
    private readonly history?: ReactiveHistoryStack;
    private readonly historyLabel?: (prev: ReactiveData, next: ReactiveData) => string | undefined;

    /**
     * Creates Reactive Field
     * @param initial Reactive Field Initial Value
     * @param options Reactive Field Options
     */
    constructor(initial: ReactiveData, options: ReactiveFieldOptions<ReactiveData> = {}) {
        this._value = initial;
        this.equals = options.equals ?? Object.is;
        this.history = options.history;
        this.historyLabel = options.historyLabel;
    }

    /**
     * Get Current Reactive Value
     */
    public get value(): ReactiveData {
        // dependency tracking hook
        useTracking(() => this.addListener(() => {}));
        return this._value;
    }

    /**
     * Set Current Reactive Value
     * @param next New Value
     */
    public set value(next: ReactiveData) {
        this.set(next);
    }

    /**
     * Return Field Listener Count
     */
    public get listenerCount(): number {
        return this.changed.listenerCount;
    }

    /**
     * Set Reactive Field Value
     * @param next New Reactive Field Value
     */
    public set(next: ReactiveData): void {
        const prev = this._value;
        if (this.equals(prev, next)) return;

        const history = this.history;
        const shouldPush = !!history && !history.isApplying;

        if (shouldPush) {
            history!.push({
                label: this.historyLabel?.(prev, next),
                undo: () => this.set(prev),
                redo: () => this.set(next)
            });
        }

        this._value = next;
        this.changed.invoke(next);
    }

    /**
     * Update Current Reactive Field
     * @param fn
     */
    public update(fn: (current: ReactiveData) => ReactiveData): void {
        this.set(fn(this._value));
    }

    /**
     * Add Listener to Reactive Field
     * @param fn {ReactiveListener} Reactive Listener
     * @param options {ReactiveListenerOptions} Listener Options
     * @return {Unsubscribe} Unsubscribe Method
     */
    public addListener(fn: ReactiveFieldListener<ReactiveData>, options?: ReactiveListenerOptions): Unsubscribe {
        return this.changed.addListener(fn, options);
    }

    /**
     * Remove Listener from Reactive Field
     * @param fn {ReactiveListener} Reactive Listener
     */
    public removeListener(fn: ReactiveFieldListener<ReactiveData>): void {
        this.changed.removeListener(fn);
    }

    /**
     * Remove All Listeners from Reactive Field
     */
    public removeAllListeners(): void {
        this.changed.removeAllListeners();
    }

    /**
     * Invoke Listener Once and Dispose Field
     * @param fn {ReactiveListener} Reactive Listener
     * @param options {ReactiveListenerOptions} Listener Options
     * @return {Unsubscribe} Unsubscribe Method
     */
    public invokeOnce(fn: ReactiveFieldListener<ReactiveData>, options?: ReactiveListenerOptions): Unsubscribe {
        return this.changed.invokeOnce(fn, options);
    }
}