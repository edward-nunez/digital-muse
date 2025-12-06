import path from "node:path";
import process from "node:process";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    // Load env file based on mode (local, development, production)
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
        root: "src",
        publicDir: "../public",
        build: {
            outDir: "../dist",
            // Ensure assets are hashed for cache busting
            rollupOptions: {
                output: {
                    entryFileNames: 'assets/[name].[hash].js',
                    chunkFileNames: 'assets/[name].[hash].js',
                    assetFileNames: 'assets/[name].[hash][extname]',
                },
            },
        },
        resolve: {
            alias: { "/src": path.resolve(process.cwd(), "src") }
        },
        define: {
            // Expose env vars to client
            __APP_ENV__: JSON.stringify(mode),
        },
    };
});