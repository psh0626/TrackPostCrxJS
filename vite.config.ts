import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import babel from "@rolldown/plugin-babel";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

const ReactCompilerConfig = {
    /* ... */
};

// https://vitejs.dev/config/
export default defineConfig(() => {
    return {
        plugins: [
            viteReact(),
            babel({ presets: [reactCompilerPreset()] }),
            crx({ manifest: manifest as unknown as ManifestV3Export }),
        ],
        build: {
            rollupOptions: {
                input: {
                    sidepanel: "/src/background-service//ui/sidepanel.html",
                    options: "/src/background-service//ui/options.html",
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
    };
});
