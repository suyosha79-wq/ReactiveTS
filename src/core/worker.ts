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

/**
 * Worker Message
 */
export type WorkerMessage<T = unknown> = {
    type: string;
    payload: T;
};

/**
 * Worker Bridge
 */
export type WorkerBridge = {
    post<T>(message: WorkerMessage<T>): void;
    onMessage: ReactiveEvent<WorkerMessage>;
    dispose(): void;
};

/**
 * Create strongly-typed helper bridge for browser/web-worker style messaging
 */
export function createWorkerBridge(worker: Pick<Worker, "postMessage" | "addEventListener" | "removeEventListener">): WorkerBridge {
    const onMessage = new ReactiveEvent<WorkerMessage>();
    const listener = (event: MessageEvent<WorkerMessage>) => onMessage.invoke(event.data);

    worker.addEventListener("message", listener as EventListener);

    return {
        post(message) {
            worker.postMessage(message);
        },
        onMessage,
        dispose() {
            worker.removeEventListener("message", listener as EventListener);
            onMessage.removeAllListeners();
        }
    };
}
