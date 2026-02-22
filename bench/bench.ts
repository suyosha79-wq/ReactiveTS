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
 * Benchmark Testing
 */
/**
 * Import Required
 */
import { useBatch, useComputed, useEffect, ReactiveHistoryStack, ReactiveArray, ReactiveEvent, ReactiveField, ReactiveObject, useReactiveTransaction } from "../src";

/**
 * Helpers
 */
function hrtimeMs(): number {
    const ns = process.hrtime.bigint();
    return Number(ns) / 1_000_000;
}

function fmt(n: number): string {
    return n.toFixed(2);
}

async function microtask(): Promise<void> {
    await Promise.resolve();
}

async function runCase(
    name: string,
    iters: number,
    fn: () => void | Promise<void>,
    options?: { warmup?: number; flushMicrotasks?: boolean }
) {
    const warmup = options?.warmup ?? Math.max(1_000, Math.floor(iters * 0.1));
    const flushMicrotasks = options?.flushMicrotasks ?? false;

    // Warmup
    for (let i = 0; i < warmup; i++) await fn();
    if (flushMicrotasks) await microtask();

    // Best-effort GC (node --expose-gc)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    g.gc?.();

    const t0 = hrtimeMs();
    for (let i = 0; i < iters; i++) await fn();
    if (flushMicrotasks) await microtask();
    const t1 = hrtimeMs();

    const ms = t1 - t0;
    const ops = (iters / ms) * 1000;

    console.log(`${name.padEnd(40)}  ${fmt(ms)} ms   ${fmt(ops)} ops/s`);
}

/**
 * Benchmark Case
 */
async function main() {
    const iters = Number(process.env.ITERS ?? 200_000);

    console.log(`ReactiveTS benchmarks`);
    console.log(`Node: ${process.version}`);
    console.log(`Iters: ${iters}`);
    console.log(``);

    // 1) ReactiveField set (no listeners)
    {
        const f = new ReactiveField(0);
        await runCase("Field.set (no listeners)", iters, () => { f.value++; }, { flushMicrotasks: true });
    }

    // 2) ReactiveField set (1 listener)
    {
        const f = new ReactiveField(0);
        f.addListener(() => {});
        await runCase("Field.set (1 listener)", iters, () => { f.value++; }, { flushMicrotasks: true });
    }

    // 3) ReactiveField set (10 listeners)
    {
        const f = new ReactiveField(0);
        for (let i = 0; i < 10; i++) f.addListener(() => {});
        await runCase("Field.set (10 listeners)", iters, () => { f.value++; }, { flushMicrotasks: true });
    }

    // 4) Computed chain (a -> b -> c)
    {
        const a = new ReactiveField(0);
        const b = useComputed(() => a.value + 1);
        const c = useComputed(() => b.value + 1);
        c.addListener(() => {});
        await runCase("Computed chain (3 nodes)", iters, () => { a.value++; }, { flushMicrotasks: true });
        b.dispose?.();
        c.dispose?.();
    }

    // 5) Effect re-run cost
    {
        const a = new ReactiveField(0);
        const stop = useEffect(() => { void a.value; });
        await runCase("Effect re-run", iters, () => { a.value++; }, { flushMicrotasks: true });
        stop();
    }

    // 6) ReactiveObject proxy set
    {
        const s = new ReactiveObject({ user: { name: "Ada", age: 1 }, count: 0 });
        await runCase("ReactiveObject set (root)", iters, () => { s.value.count++; }, { flushMicrotasks: true });
    }

    // 7) ReactiveObject deep set (nested)
    {
        const s = new ReactiveObject({ user: { name: "Ada", age: 1 }, count: 0 });
        await runCase("ReactiveObject set (deep)", iters, () => { s.value.user.age++; }, { flushMicrotasks: true });
    }

    // 8) Path listener filtering (exact)
    {
        const s = new ReactiveObject({ user: { name: "Ada", age: 1 }, count: 0 });
        s.addPathListener("user.age", () => {}, { mode: "exact" });
        await runCase("Path listener (exact match)", iters, () => { s.value.user.age++; }, { flushMicrotasks: true });
    }

    // 9) ReactiveArray push/splice
    {
        const arr = new ReactiveArray<number>([]);
        await runCase("ReactiveArray push", Math.min(iters, 100_000), () => { arr.value.push(1); }, { flushMicrotasks: true });
    }
    {
        const arr = new ReactiveArray<number>(Array.from({ length: 1000 }, (_, i) => i));
        await runCase("ReactiveArray splice mid", Math.min(iters, 50_000), () => { arr.value.splice(500, 1, 999); }, { flushMicrotasks: true });
    }

    // 10) Batching effectiveness
    {
        const f = new ReactiveField(0);
        let calls = 0;
        f.addListener(() => { calls++; });

        await runCase("Batch(100 sets) => 1 wave", Math.min(50_000, iters), async () => {
            calls = 0;
            useBatch(() => {
                for (let i = 0; i < 100; i++) f.value++;
            });
            // ensure microtask flush happens
            await microtask();
            if (calls === 0) throw new Error("Listener didn't run (unexpected)");
        }, { warmup: 1000, flushMicrotasks: false });
    }

    // 11) History push + undo/redo (field)
    {
        const history = new ReactiveHistoryStack();
        const f = new ReactiveField(0, { history });
        await runCase("History: set+undo+redo", Math.min(iters, 100_000), () => {
            f.value++;
            history.undo();
            history.redo();
        }, { flushMicrotasks: true });
    }

    // 12) Transaction history grouping
    {
        const history = new ReactiveHistoryStack();
        const f = new ReactiveField(0, { history });

        await runCase("Transaction(100 sets)+undo", Math.min(20_000, iters), async () => {
            useReactiveTransaction(history, () => {
                for (let i = 0; i < 100; i++) f.value++;
            }, "tx");
            history.undo();
            await microtask();
        }, { warmup: 200, flushMicrotasks: false });
    }

    // 13) ReactiveEvent invoke (sync listeners)
    {
        const ev = new ReactiveEvent<number>();
        for (let i = 0; i < 10; i++) ev.addListener(() => {});
        await runCase("Event.invoke (10 listeners)", iters, () => { ev.invoke(1); }, { flushMicrotasks: true });
    }

    console.log(`\nDone.`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});