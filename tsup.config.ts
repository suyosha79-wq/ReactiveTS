import { defineConfig } from "tsup";

export default defineConfig([
    {                           // Module
        entry: {
            index: "src/index.ts",
            bench: "bench/bench.ts"
        },
        format: ["esm", "cjs"],
        dts: true,
        sourcemap: true,
        clean: true,
        treeshake: true,
        target: "es2022",
        outDir: "dist"
    },
    {                           // Browser Dist
        entry: {
            "reactivets": "src/index.ts"
        },
        format: ["iife"],
        globalName: "ReactiveTS",      // window.ReactiveTS
        sourcemap: true,
        minify: true,                  // можно выключить для дебага
        treeshake: true,
        target: "es2018",              // шире совместимость
        outDir: "browser"
    }
]);