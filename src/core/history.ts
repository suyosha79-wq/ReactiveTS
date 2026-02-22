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
 * Reactive History Entry Interface
 */
export interface IReactiveHistoryEntry {
    label?: string;                     // History Name (Not Required)
    undo(): void;                       // Undo History
    redo(): void;                       // Redo History
}

/**
 * Reactive Transaction
 */
type ReactiveTransaction = {
    label?: string;                     // Transaction Name (Not Required)
    entries: IReactiveHistoryEntry[];   // History Entry
};

/**
 * Reactive History Stack
 */
export class ReactiveHistoryStack {
    // History Parameters
    private past: IReactiveHistoryEntry[] = [];
    private future: IReactiveHistoryEntry[] = [];
    private applying = false;
    private tx: ReactiveTransaction | null = null;

    /**
     * @return {boolean} Is Undo available
     */
    public get canUndo(): boolean {
        return this.past.length > 0;
    }

    /**
     * @return {boolean} Is Redo available
     */
    public get canRedo(): boolean {
        return this.future.length > 0;
    }

    /**
     * @return {boolean} Is History Applying
     */
    public get isApplying(): boolean {
        return this.applying;
    }

    /**
     * @return {boolean} Is current in transaction
     */
    public get inTransaction(): boolean {
        return this.tx !== null;
    }

    /**
     * Begin Transaction
     * @param label {string} Transaction Name
     */
    public beginTransaction(label?: string): void {
        if (this.applying) return;
        if (this.tx) return; // no nested for simplicity
        this.tx = {label, entries: []};
    }

    /**
     * End Transaction
     */
    public endTransaction(): void {
        if (!this.tx) return;
        const {label, entries} = this.tx;
        this.tx = null;

        if (entries.length === 0) return;
        if (entries.length === 1) {
            const e = entries[0]!;
            this.push({...e, label: label ?? e.label});
            return;
        }

        // Create Composite for History
        const composite: IReactiveHistoryEntry = {
            label,
            undo: () => {
                // undo in reverse
                for (let i = entries.length - 1; i >= 0; i--) entries[i]!.undo();
            },
            redo: () => {
                // redo in forward
                for (const e of entries) e.redo();
            }
        };

        this.push(composite);
    }

    /**
     * Push into History
     * @param entry {IReactiveHistoryEntry} History Entry
     */
    public push(entry: IReactiveHistoryEntry): void {
        if (this.applying) return;

        if (this.tx) {
            this.tx.entries.push(entry);
            return;
        }

        this.past.push(entry);
        this.future.length = 0;
    }

    /**
     * Undo Transaction
     */
    public undo(): void {
        const entry = this.past.pop();
        if (!entry) return;
        this.applying = true;
        try {
            entry.undo();
            this.future.push(entry);
        } finally {
            this.applying = false;
        }
    }

    /**
     * Redo Transaction
     */
    public redo(): void {
        const entry = this.future.pop();
        if (!entry) return;
        this.applying = true;
        try {
            entry.redo();
            this.past.push(entry);
        } finally {
            this.applying = false;
        }
    }

    /**
     * Clear History
     */
    public clear(): void {
        this.past.length = 0;
        this.future.length = 0;
        this.tx = null;
    }
}

/**
 * Use Reactive Transaction
 * @param history {ReactiveHistoryStack} History Stack
 * @param fn Transaction
 * @param label {string} Transaction Name
 */
export function useReactiveTransaction<Transaction>(history: ReactiveHistoryStack, fn: () => Transaction, label?: string): Transaction {
    history.beginTransaction(label);
    try {
        return fn();
    } finally {
        history.endTransaction();
    }
}