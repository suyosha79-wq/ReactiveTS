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
// Import Required Features
import { ReactiveHistoryStack, useReactiveTransaction } from "./history";

/**
 * Transaction Context
 */
export type TransactionContext = {
    label?: string;
    startedAt: number;
};

/**
 * Transaction Middleware
 */
export type TransactionMiddleware = {
    before?(ctx: TransactionContext): void;
    after?(ctx: TransactionContext & { durationMs: number }): void;
};

/**
 * Transaction Profile
 */
export type TransactionProfile = {
    label?: string;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
};

/**
 * Transaction manager with middleware + profiling support
 */
export class ReactiveTransactionManager {
    // Middleware
    private readonly middlewares = new Set<TransactionMiddleware>();

    /**
     * Create Transaction with History
     * @param history {ReactiveHistoryStack} History Stack
     */
    constructor(private readonly history: ReactiveHistoryStack = new ReactiveHistoryStack()) {}

    /**
     * Get History
     */
    public getHistory(): ReactiveHistoryStack {
        return this.history;
    }

    /**
     * Use as Middleware
     * @param middleware {TransactionMiddleware} Transaction Middleware
     */
    public use(middleware: TransactionMiddleware): () => void {
        this.middlewares.add(middleware);
        return () => this.middlewares.delete(middleware);
    }

    /**
     * Run Middleware
     * @param fn {Function} Middleware Function
     * @param label {string} Label
     */
    public run<T>(fn: () => T, label?: string): T {
        const startedAt = Date.now();
        const ctx: TransactionContext = { label, startedAt };

        for (const middleware of this.middlewares) {
            middleware.before?.(ctx);
        }

        try {
            return useReactiveTransaction(this.history, fn, label);
        } finally {
            const finishedAt = Date.now();
            const afterCtx = {
                ...ctx,
                durationMs: finishedAt - startedAt
            };
            for (const middleware of this.middlewares) {
                middleware.after?.(afterCtx);
            }
        }
    }
}

/**
 * Collect transaction timing profiles
 */
export function createTransactionProfiler(target: TransactionProfile[] = []): TransactionMiddleware {
    return {
        after(ctx) {
            target.push({
                label: ctx.label,
                startedAt: ctx.startedAt,
                finishedAt: ctx.startedAt + ctx.durationMs,
                durationMs: ctx.durationMs
            });
        }
    };
}