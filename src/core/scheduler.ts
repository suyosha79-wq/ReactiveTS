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
 * Scheduler Job Method
 */
type ReactiveJob = () => void;

// Setup Scheduler Variables
let batchDepth : number         =       0;                      // Batching Depth
let scheduled : boolean         =       false;                  // Is Scheduled
const queue : Set<ReactiveJob>  =   new Set<ReactiveJob>();     // Jobs Queue

/**
 * Add and Complete all scheduled tasks
 */
function flush() {
    scheduled = false;
    const jobs = Array.from(queue);
    queue.clear();
    for (const job of jobs) job();
}

/**
 * Schedule Reactive Task and run after tick
 * @param job {ReactiveJob} Reactive Job
 */
export function useSchedule(job: ReactiveJob): void {
    queue.add(job);
    if (batchDepth > 0) return;
    if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
    }
}

/**
 * Use Batcher for Reactive Jobs with Depth
 * @param fn {Function} Reactive Task
 */
export function useBatch<ReactiveTask>(fn: () => ReactiveTask): ReactiveTask {
    batchDepth++;
    try {
        return fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && queue.size > 0 && !scheduled) {
            scheduled = true;
            queueMicrotask(flush);
        }
    }
}

/**
 * Check if Reactive Batching is in Progress
 * @return {boolean} Has Batched Subscribers in Progress
 */
export function isReactiveBatching(): boolean {
    return batchDepth > 0;
}