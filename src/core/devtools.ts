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
 * DevTools Record
 */
export type DevToolsRecord = {
    type: string;                   // Record Type
    payload: unknown;               // Payload
    at: number;                     // Index
};

/**
 * Minimal built-in Reactive devtools event bus
 */
export class ReactiveDevTools {
    // Records and Stream
    private readonly records: DevToolsRecord[] = [];
    private readonly stream : ReactiveEvent<DevToolsRecord> = new ReactiveEvent<DevToolsRecord>();

    /**
     * Invoke
     * @param type {string} Record Type
     * @param payload Payload
     */
    public invoke(type: string, payload: unknown): void {
        const record: DevToolsRecord = { type, payload, at: Date.now() };
        this.records.push(record);
        this.stream.invoke(record);
    }

    /**
     * Clear All Records
     */
    public clear(): void {
        this.records.length = 0;
    }

    /**
     * Inspect Records
     */
    public inspect(): readonly DevToolsRecord[] {
        return this.records;
    }

    /**
     * Add Listener
     * @param fn {Function} Record Listener
     */
    public addListener(fn: (record: DevToolsRecord) => void): () => void {
        return this.stream.addListener((record) => fn(record), { batched: false });
    }
}