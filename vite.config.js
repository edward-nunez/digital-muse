import path from "node:path";
import process from "node:process";
import { defineConfig } from "vite";

export default defineConfig({
    root: "src",
    publicDir: "../public",
    build: {
        outDir: "../dist"
    },
    resolve: {
        alias: { "/src": path.resolve(process.cwd(), "src") }
    },
})