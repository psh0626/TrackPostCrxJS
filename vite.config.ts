import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), crx({ manifest: manifest as unknown as ManifestV3Export })],
    build: {
        rollupOptions: {
            input: {
                sidepanel: "pages/sidepanel.html",
                options: "pages/options.html",
            },
            onwarn(warning, warn) {
                // Suppress “Module level directives cause errors when bundled” warnings
                if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
                    return;
                }
                warn(warning);
            },
        },
    },
    legacy: {
        skipWebSocketTokenCheck: true,
    },
});
