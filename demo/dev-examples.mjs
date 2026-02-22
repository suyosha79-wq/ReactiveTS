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
// Import All Features
import {
    ReactiveField,
    ReactiveObject,
    ReactiveHistoryStack,
    ReactiveTransactionManager,
    createTransactionProfiler,
    createSnapshot,
    restoreSnapshot,
    useSync,
    useOneWaySync,
    useLens,
    useAtom,
    useComputed,
    ReactiveDevTools,
    createWorkerBridge,
    ReactiveEvent
} from "../dist/index.js";

// Small helper for readable terminal output blocks.
const section = (title) => console.log(`\n=== ${title} ===`);

// -----------------------------------------------------------------------------
// Transaction Middleware + Profiler
// -----------------------------------------------------------------------------
section("Transaction Middleware + Profiler");

// History is used by transaction manager to group undo/redo records.
const history = new ReactiveHistoryStack();
const txManager = new ReactiveTransactionManager(history);

// Profiler middleware collects duration of each transaction into this array.
const txProfiles = [];
txManager.use(createTransactionProfiler(txProfiles));

// Field linked to history so changes inside transaction are tracked.
const count = new ReactiveField(0, { history });

// Run transactional update with a label.
txManager.run(() => {
    count.value = 1;
    count.value = 2;
}, "count:update");

console.log("count:", count.value, "profiles:", txProfiles.length);

// -----------------------------------------------------------------------------
// Snapshot API
// -----------------------------------------------------------------------------
section("Snapshot API");

// Create source value and capture immutable snapshot copy.
const state = new ReactiveField({ user: { name: "Ada" }, flag: false });
const snap = createSnapshot(state);

// Mutate value, then roll back from snapshot.
state.value = { user: { name: "Grace" }, flag: true };
restoreSnapshot(state, snap);

console.log("restored:", state.value.user.name, state.value.flag);

// -----------------------------------------------------------------------------
// Sync API
// -----------------------------------------------------------------------------
section("Sync API");

// Two-way sync: changes in one field flow into the other.
const left = new ReactiveField("left");
const right = new ReactiveField("right");
const stopTwoWay = useSync(left, right);

left.value = "synced";
// Wait one microtask because listeners are batched by default.
await Promise.resolve();
console.log("two-way right:", right.value);
stopTwoWay();

// One-way sync: source -> target only.
const source = new ReactiveField(1);
const target = new ReactiveField(0);
const stopOneWay = useOneWaySync(source, target);
source.value = 5;
await Promise.resolve();
console.log("one-way target:", target.value);
stopOneWay();

// -----------------------------------------------------------------------------
// Lens + Atom
// -----------------------------------------------------------------------------
section("Lens + Atom");

// Lens focuses nested value inside reactive object.
const profile = new ReactiveObject({ profile: { nickname: "neo" } });
const nicknameLens = useLens(profile, ["profile", "nickname"]);

// Atom = lightweight field primitive.
const localAtom = useAtom(false);

nicknameLens.value = "trinity";
localAtom.value = true;
await Promise.resolve();
console.log("lens:", profile.value.profile.nickname, "atom:", localAtom.value);

// -----------------------------------------------------------------------------
// Inspect Dependencies
// -----------------------------------------------------------------------------
section("Inspect Dependencies");

// Computed automatically tracks `a` and `b` as dependencies.
const a = new ReactiveField(3);
const b = new ReactiveField(4);
const sum = useComputed(() => a.value + b.value);
console.log("sum:", sum.value, "deps:", sum.inspectDependencies().length);

// -----------------------------------------------------------------------------
// DevTools
// -----------------------------------------------------------------------------
section("DevTools");

// Minimal in-memory event stream for debugging records.
const devtools = new ReactiveDevTools();
devtools.addListener((record) => console.log("devtools event:", record.type));
devtools.invoke("state:update", { value: 10 });
console.log("records:", devtools.inspect().length);

// -----------------------------------------------------------------------------
// Worker Bridge (mock)
// -----------------------------------------------------------------------------
section("Worker Bridge (mock)");

// Mock worker to make this script runnable in Node without real Web Worker.
const handlers = new Set();
const mockWorker = {
    postMessage(message) {
        for (const h of handlers) h({ data: message });
    },
    addEventListener(_type, handler) {
        handlers.add(handler);
    },
    removeEventListener(_type, handler) {
        handlers.delete(handler);
    }
};

// Bridge exposes worker messages as ReactiveEvent.
const bridge = createWorkerBridge(mockWorker);
bridge.onMessage.addListener((message) => {
    console.log("worker message:", message.type);
}, { batched: false });
bridge.post({ type: "PING", payload: { ok: true } });
bridge.dispose();

// -----------------------------------------------------------------------------
// ReactiveEvent sanity
// -----------------------------------------------------------------------------
section("ReactiveEvent sanity");

// Simple sync listener example.
const event = new ReactiveEvent();
event.addListener((msg) => console.log("event:", msg), { batched: false });
event.invoke("done");

console.log("\nDev examples completed.");
