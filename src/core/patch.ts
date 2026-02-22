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
// Path and Patch
export type Path = Array<string | number | symbol>;
export type Patch =
    | { op: "set"; path: Path; prev: unknown; next: unknown }
    | { op: "delete"; path: Path; prev: unknown }
    | { op: "splice"; path: Path; index: number; deleteCount: number; items: unknown[]; removed: unknown[] };

// Path Spec
export type PathSpec = string | Path;

/**
 * Convert path to string
 * @param path
 */
export function pathToString(path: Path): string {
    return path
        .map((p) => (typeof p === "symbol" ? p.toString() : String(p)))
        .join(".");
}

/**
 * Parse path spec
 * @param spec {PathSpec}
 */
export function parsePathSpec(spec: PathSpec): string[] {
    if (Array.isArray(spec)) return spec.map((x) => String(x));
    // "user.name" or "items.*.id"
    return spec.split(".").filter(Boolean);
}

/**
 * Patch Path to Segments
 * @param path
 */
export function patchPathToSegments(path: Path): string[] {
    return path.map((x) => String(x));
}

/**
 * Match Path
 *
 * matches:
 *  - exact: "user.name"
 *  - prefix: "user" matches "user.name", "user.age"
 *  - wildcard: "items.*.id" matches "items.0.id", "items.10.id"
 */
export function matchPath(specSegs: string[], pathSegs: string[], mode: "exact" | "prefix" = "prefix"): boolean {
    if (mode === "exact" && specSegs.length !== pathSegs.length) return false;
    if (specSegs.length > pathSegs.length) return false;

    for (let i = 0; i < specSegs.length; i++) {
        const s = specSegs[i]!;
        const p = pathSegs[i]!;
        if (s === "*") continue;
        if (s !== p) return false;
    }

    return mode === "exact" ? specSegs.length === pathSegs.length : true;
}