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
 * Unsubscribe Method
 */
export type Unsubscribe = () => void;

/**
 * Disposable Interface
 */
export interface IDisposable {
    /**
     * Dispose Method
     */
    dispose(): void;
}

/**
 * Multiple Merge Unsubscribe methods
 * @param fns {Array<Unsubscribe|undefined>} Reactive Unsubscribe Method
 * @return {Unsubscribe} Return Unsubscribe Method
 */
export function mergeUnsubscribe(...fns: Array<Unsubscribe | undefined>): Unsubscribe {
    let disposed = false;
    return () => {
        if (disposed) return;
        disposed = true;
        for (const fn of fns) {
            try {
                fn?.();
            } catch {
                // unsubscribe must never crash userland
            }
        }
    };
}

/**
 * Reactive Watcher for Automatic Dispose
 */
export class ReactiveWatcher implements IDisposable {
    // Disposers
    private disposers = new Set<Unsubscribe>();
    private _disposed = false;

    /**
     * Is Disposed
     */
    public get disposed(): boolean {
        return this._disposed;
    }

    /**
     * Add Watcher for Reactive Subscriber
     * @param unsub {Unsubscribe} Unsubscribe Method
     * @return {Unsubscribe} Return Unsubscribe Method
     */
    public add(unsub: Unsubscribe): Unsubscribe {
        if (this._disposed) {
            try { unsub(); } catch {}
            return () => {};
        }
        this.disposers.add(unsub);
        return () : boolean => this.disposers.delete(unsub);
    }

    /**
     * Add Watcher for Reactive Subscriber and Return them
     * @param unsub {Unsubscribe} Unsubscribe Method
     * @return {Unsubscribe} Return Unsubscribe Method
     */
    public watch(unsub: Unsubscribe): Unsubscribe {
        this.add(unsub);
        return unsub;
    }

    /**
     * Dispose All Added Reactive Subscribers
     */
    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;

        const list = Array.from(this.disposers);
        this.disposers.clear();
        for (const d of list) {
            try { d(); } catch {}
        }
    }
}