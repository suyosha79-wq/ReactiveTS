# ReactiveTS
A **reactive state engine for TypeScript** with fields, events, objects, arrays, computed values, effects, batching, path subscriptions, async support, cancellation, and built-in undo/redo history.

---

[Get Started]() | [Other Libraries](https://github.com/neurosell) | [Website](https://neurosell.top/)

---

❓ **Why ReactiveTS?**<br/>
🔹 **Lightweight Library** with zero dependencies;<br/>
🔹 **Powerful** Reactive state engine written in Typescript;<br/>
🔹 **History and Transactions** support;<br/>
🔹 **Production ready** with benchmarks;<br/>

**ReactiveTS combines:**
* **Reactive fields** (signals);
* **Reactive objects & arrays** (Proxy-based);
* Computed values with **automatic dependency tracking**;
* **``useEffect``-like** side effects;
* **Path-level subscriptions** with wildcard support (``user.name``, ``items.*.id``);
* **Batching & transactions**;
* **Undo/Redo history** (including grouped transactions);
* **Async listeners** with cancellation;
* **Adapters:** ``toPromise``, ``fromEvent``, ``fromObservable``;
* **WeakMap proxy cache** for stable nested references;

## Table of Contents
* [Installation](#installation)
* [Core Concepts](#core-concepts)
* [ReactiveField](#reactive-fields)
* [ReactiveEvent](#reactive-events)
* [ReactiveObject](#reactive-objects)
* [ReactiveArray](#reactive-arrays)
* [Computed](#computed)
* [Selectors](#selectors)
* [Effect](#effects)
* [Batching](#batching)
* [History & Transactions](#history-and-transactions)
* [Path Subscriptions](#path-subscriptions)
* [Async & Cancellation](#async-and-cancellation)
* [Views (``useFiltered``, ``useMapped``, ``useSorted``)](#views-filtering-mapping-sorting)
* [Adapters (``toPromise``, ``fromEvent``, ``fromObservable``)](#adapters-and-converters)
* [Reactive Watcher (auto-unsubscribe)](#reactive-watcher)
* [Performance Notes](#performance-notes-and-benchmark)
* [Comparison Philosophy](#comparison-philosophy)
* [License](#license)

### Installation
To install the library, you can use NPM:
```bash
npm install @neurosell/reactivets
```

**Or from CDN:**
```html
<script src="https://cdn.jsdelivr.net/npm/@neurosell/reactivets@0.9.5/browser/reactivets.global.js"></script>
<script type="text/javascript">
    // Will be connected as Global
    const { ReactiveField } = window.ReactiveTS;
</script>
```

**Manual GitHub Installation for developers:**
```bash
git clone https://github.com/Neurosell/ReactiveTS.git
cd ./ReactiveTS/
npm install
npm run build
```

### Core Concepts
**ReactiveTS** Library is built around:
* **State-first** reactivity;
* **Automatic dependency** tracking;
* **Microtask** batching;
* **Deterministic** undo/redo with **transactions** support;
* **Minimal** boilerplate;

**You work with state naturally:**
```javascript
state.value.user.name = "Elijah";
```

And everything reacts. Simple.

### Reactive Fields
**ReactiveField** is a reactive primitive (similar to a signal).
> By default, **ReactiveTS** coalesces (merges) reactions into a single microtask.
> The restart of effects and reactive fields is scheduled once and will be executed at the end of the tick, so it only sees the last value. This is due to the batching system for optimization, so you should take this into account in your work.

**Basic Usage:**
```javascript
// Import
import { ReactiveField } from "@neurosell/reactivets";

// Create Reactive Field
const count = new ReactiveField(0);
count.addListener((v) => {
    console.log("count:", v);
});

count.value = 1;
```

**Batching and Unsubscribe:**
```javascript
// Let's Create our Reactive Field
const count = new ReactiveField(0);

// Listener Returns Unsubscribe Method
const unsub = count.addListener((v) => {
    console.log("count:", v);
});

count.value = 1;
await new Promise(resolve => {}) // If you don't wait before unsubscribe in single tick - batching does't run reactive listener
unsub();
```

### Reactive Events
**Reactive events** are generally similar in concept to reactive fields, but typically do not contain a current value (such as fields or objects), except when you use history.

**Let's look at basic usage:**
```javascript
// Import Events Class
import { ReactiveEvent } from "@neurosell/reactivets";

// Create Event
const event = new ReactiveEvent<string>();

// Add Listener
event.addListener((msg, ctx) => {
    console.log(msg);
});

// Invoke Event
event.invoke("hello");
```

**You can also use async event listeners:**
```javascript
event.addListener(async (msg, ctx) => {
    await new Promise(r => setTimeout(r, 100));
    if (ctx.signal.aborted) return;
    console.log(msg);
});
```

**Reactive Events Supports:**
* **batched** listeners;
* **AbortSignal** cancellation;
* ``invokeAsync()`` for async events;

### Reactive Objects
**Reactive objects** are similar to fields, but they can contain any objects. This is useful when you need to track changes, for example, in user data. Reactive objects work through **Proxy**, can also use **Patch Tracking**, and support **change history** (stream).

**Let's look at basic usage:**
```javascript
import { ReactiveObject } from "@neurosell/reactivets";

// Create our Object
const state = new ReactiveObject({
    user: { name: "Ada" },
    count: 0
});

// Add Listener
state.addListener((patch) => {
    console.log("patch:", patch);
});

// Let's change object
state.value.count++;
state.value.user.name = "Grace";
```

**Listener contains patch for our changes. For example:**
```javascript
{
  patch: {
    op: "set",              // Operation
    path: ['count'],        // Object Path
    prev: 0,                // Preview Value
    next: 1                 // Next Value
  }
}
```

### Reactive Arrays
Reactive arrays work in a similar way to objects, but additional filters and other functions can be applied to them (which we will discuss later).

**Basic Usage with Patch Tracking:**
```javascript
import { ReactiveArray } from "@neurosell/reactivets";

// Our Array
const list = new ReactiveArray<number>([1, 2]);

// Similar Add Listener
list.addListener((patch) => {
    console.log("array patch:", patch);
});

// And Try to Change Array
list.value.push(3);
list.value.splice(0, 1);
```

**Patch Example:**
```javascript
{
    op: "splice", path: [], index: 0, deleteCount: 1, items: [3], removed: [1]
}
```

### Computed
> Computed functions are needed to automatically track dependencies for calculations and recalculate the final value if one of the dependencies changes. An example of the logic behind such calculations can be found in linked cells in Excel — when you change one of the two, the sum changes.

**Computed are:**
* **tracks dependencies** automatically;
* **recomputes final value** when dependencies change;
* **batched**;
* **supports lazy mode**;
* supports **custom equality**;

**Let's look at simple example:**
```javascript
import { ReactiveField, useComputed } from "@neurosell/reactivets";

// Let's create two Reactive Fields
const a = new ReactiveField(2);
const b = new ReactiveField(3);

// Create Computed Function
const sum = useComputed(() => a.value + b.value);

// Add Listener for Sum
sum.addListener((v) => console.log("sum:", v));

// Now let's change A
a.value = 10;

// And after 100ms change B, computed listener printed new value
await new Promise(resolve => setTimeout(resolve, 100));
a.value = 5;
```

### Selectors
**Selectors** are needed to respond to changes in only certain object fields without unnecessarily triggering listeners.

**Simple selector example:**
```javascript
import { ReactiveField, useSelect } from "@neurosell/reactivets";

// Create our user
const user = new ReactiveField({ id: 1, name: "Ada" });

// Select only name
const name = useSelect(user, u => u.name);

// Add Listener for name chages
name.addListener(n => console.log(n));

// Update Value
user.value = { ...user.value, name: "Grace" };

// Try to change ID after 100ms, Name listener not called after this action :)
await new Promise(resolve => setTimeout(resolve, 100));
user.value.id = 2;
```

### Effects
Side effects with automatic dependency tracking and cleanup.

**Use Case:**
```javascript
import { ReactiveField, useEffect } from "@neurosell/reactivets";

// Create our Reactive Field
const count = new ReactiveField(0);

const stop = useEffect(() => {
    console.log("count is", count.value);

    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
});

// Let's Change Value
count.value = 1;

// Wait 100ms and stop our effector
// The next value changes can't be called in useEffect listener
await new Promise(resolve => setTimeout(resolve, 100));
stop();
count.value = 2;
```

### Batching
Batch multiple mutations into one reactive wave. By defaults all mutations will be batched in first generation.

**Use Case:**
```javascript
import { ReactiveField, useBatch } from "@neurosell/reactivets";

// Let's create our field
const f = new ReactiveField(0);
f.addListener(v => console.log(v));

// Batch our calculation
useBatch(() => {
    f.value = 1;
    f.value = 2;
    f.value = 3;
});
```

> Only one notification wave runs with ``useBatch`` helper.

### History and Transactions
**ReactiveTS** supports powerful built-in undo/redo system with transactions support.

**Simple use case:**
```javascript
import { ReactiveField, ReactiveHistoryStack } from "@neurosell/reactivets";

// Create our history stack
const history = new ReactiveHistoryStack();

// Create Reactive Field with History Stack
const count = new ReactiveField(0, { history });

// Fill our history
count.value = 1;
count.value = 2;

// Work with history
history.undo();
console.log(count.value); // 1
history.undo();
console.log(count.value); // 0
history.redo();
console.log(count.value); // 1
```

You can also group multiple changes into one undo step with transactions.

**Transaction Example:**
```javascript
import { useReactiveTransaction } from "@neurosell/reactivets";

console.log(count.value); // 1

// Will be applied as single step
useReactiveTransaction(history, () => {
    count.value = 10;
    count.value = 20;
    count.value = 30;
});
console.log(count.value); // 30

// Back to history
history.undo();
console.log(count.value); // 1
```

### Path Subscriptions
With **ReactiveTS** you can listen to specific paths of objects.

**Usage sample:**
```javascript
// Create our Reactive Object
const state = new ReactiveObject({
    user: {
        name: "Igor",
        age: 15
    }
});

// This Listener reacts only at user.name changes
state.addPathListener("user.name", (patch) => {
    console.log("name changed");
}, { mode: "exact" });

// This Listener reacts at all user changes
state.addPathListener("user", (patch) => {
    console.log("anything under user changed");
});

// Change our object
state.value.user.name = "Elijah";   // Calls both listeners
state.value.user.age = 10;          // Calls only second listener
```

**Path Subscription supports:**
* exact mode (``item.data.key``);
* prefix mode (``item``);
* wildcard mode (``items.*.id``)

### Async and Cancellation
You can use cancellation tokens and async listeners for your reactive fields.

**For Example:**
```javascript
const field = new ReactiveField(0);
const controller = new AbortController();

field.addListener(async (v, ctx) => {
  await someAsyncTask();
  if (ctx.signal.aborted) return;
}, { signal: controller.signal });

controller.abort();
```

### Views (Filtering, Mapping, Sorting)
To simplify working with **Reactive Arrays**, you can also use auxiliary functionality for filtering, mapping, and sorting data.

**Usage Example:**
```javascript
import { ReactiveArray, useFiltered, useMapped, useSorted } from "@neurosell/reactivets";

// Create our Array
const list = new ReactiveArray([1, 2, 3, 4]);

// Filtered Array
const evens = useFiltered(list, x => x % 2 === 0);
evens.addListener(arr => console.log(arr));

// Push new value
list.value.push(6);
```

### Adapters and Converters
**Adapters** are **helper functions** for converting reactive events, fields, and other elements into **asynchronous methods**, **Observables**, etc.

**Conversion to Promise:**
```javascript
import { toPromise } from "@neurosell/reactivets";

toPromise(event, {
  predicate: v => v > 10
}).then(v => console.log(v));
```

**Conversion to Promise Field:**
```javascript
import { toPromiseField } from "@neurosell/reactivets";

toPromiseField(field, {
    predicate: v => v === 5
});
```

**Conversion from DOM Event:**
```javascript
import { fromEvent } from "@neurosell/reactivets";

const { event, dispose } = fromEvent(document, "click");
event.addListener(e => console.log(e));
```

**Conversion from Observable:**
```javascript
import { fromObservable } from "@neurosell/reactivets";

// Observable Example
const obs = {
  subscribe(next) {
    const t = setInterval(() => next(Date.now()), 1000);
    return () => clearInterval(t);
  }
};

const { event } = fromObservable(obs);
```

### Reactive Watcher
**Reactive Watcher** in **ReactiveTS** needed to track dependent listeners and further automatically unsubscribe all listeners from specific reactive fields, events, objects, and arrays.

**Use Case:**
```javascript
import { ReactiveWatcher } from "@neurosell/reactivets";

// Create Watcher
const watcher = new ReactiveWatcher();
watcher.own(field.addListener(console.log));
watcher.dispose(); // removes all listeners
```

### Performance Notes and Benchmark
Now let's talk about **ReactiveTS** **performance and optimization** under the hood, and take a look at the **benchmarks**.

**ReactiveTS uses:**
* **Microtask batching**;
* **WeakMap proxy caching**;
* **Deduplicated scheduler** queue;
* **Version-based dependency tracking**;

**For extreme hot paths:**
1. Prefer **ReactiveField** over deep Proxy objects;
2. Use **batching**; 
3. Use **transactions** for grouped updates and history optimisation;

#### Benchmarks
**ReactiveTS** is optimized for typical UI/state scenarios (frequent changes to small fields + batching + effects). To fairly compare performance between versions/configurations, use reproducible microbenchmarks.

**The benchmarks below include the following scenarios:**
* **ReactiveField:** speed of ``set`` and listener notifications;
* **Computed:** recalculation of derived value chains;
* **Effect:** restarting effects when changes occur;
* **ReactiveObject / ReactiveArray (Proxy):** cost of ``set``/``splice`` and patch generation;
* **Path subscriptions:** filtering patches by path/mask;
* **Batching & Transactions:** how well the wave of updates coalesces;
* **History undo/redo:** cost of recording/rolling back changes;

> **Important:** Proxies and patches are inevitably more expensive than simple signals. For hot paths, use ``ReactiveField`` and computed/selectors.

#### Benchmark Results (NodeJS VPS 1vCPU, 4GB Ram), 200K Iterations
| Scenario (200K Iterations)  |        ops/s | Notes                 |
|-----------------------------|-------------:|-----------------------|
| Field.set (no listeners)    |  9,1M (21ms) | baseline              |
| Field.set (10 listeners)    | 768K (260ms) | fan-out               |
| Computed chain (3 nodes)    | 79K (2500ms) | dep tracking cost     |
| ReactiveArray push          |  4,4m (22ms) | reactive array push   |
| ReactiveObject set (deep)   | 1,1m (176ms) | Proxy + patch         |
| Batch(100 sets) => 1 wave   |  58K (859ms) | coalescing            |
| Transaction(100 sets)+undo  | 114K (174ms) | grouped history       |
| Event.invoke (10 listeners) | 864K (231ms) | reactive event invoke |

### Comparison Philosophy
In this section, we have provided you with the main comparisons with other popular reactive extension libraries.

**ReactiveTS focuses on:**
1. Reactive state management; 
2. Deterministic undo/redo and transactions;
3. Path-level reactivity and simple API;
4. TypeScript-first API;

> It is not a stream algebra engine like RxJS. It is your simple reactive state management engine!

#### ReactiveTS vs RxJS
| Feature                                         | ReactiveTS    | RxJS                     |
|-------------------------------------------------|---------------|--------------------------|
| ReactiveField                                   | ✅             | ⚠️ using BehaviorSubject |
| ReactiveObject (Proxy)                          | ✅             | ❌                        |
| Path subscriptions                              | ✅             | ❌                        |
| Computed (auto deps)                            | ✅             | ⚠️ using combineLatest   |
| useEffect-подобное                              | ✅             | ⚠️ subscribe             |
| Undo/Redo history                               | ✅             | ❌                        |
| Transaction history                             | ✅             | ❌                        |
| Stream combinators (switchMap, retry, debounce) | ⚠️ partial    | ✅ powerful               |
| Cancellation                                    | ✅ AbortSignal | ✅                        |
| Async operators                                 | ⚠️ basic      | ✅ large ecosystem        |

#### ReactiveTS vs MobX
| Feature             | ReactiveTS      | MobX                            |
|---------------------|-----------------|---------------------------------|
| Proxy-based         | ✅               | ❌ (only using getters/observables) |
| Dependency tracking | ✅               | ✅                               |
| History             | ✅               | ❌                               |
| Transaction         | ✅               | ⚠️ runInAction                  |
| Devtools ecosystem  | ❌ in development | ✅                               |
| Battle-tested       | ✅                | ✅                               |

### License
Our library is distributed under the **MIT license**. You can use it however you like. We would appreciate any feedback and suggestions for improvement.