import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [TanStackRouterVite(), react(), eslintPlugin()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: process.env.NODE_ENV === "development" && {
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
