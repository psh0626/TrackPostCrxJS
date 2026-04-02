import { crx } from "@crxjs/vite-plugin";
import babel from "@rolldown/plugin-babel";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import zip from "vite-plugin-zip-pack";
import manifest from "./manifest.json";

const ReactCompilerConfig = {
    /* ... */
};

// https://vitejs.dev/config/
export default defineConfig(() => {
    return {
        resolve: {
            alias: {
                "@": `${path.resolve(__dirname, "src")}`,
            },
        },
        plugins: [
            viteReact(),
            babel({ presets: [reactCompilerPreset()] }),
            crx({ manifest }),
            zip({ outDir: "pre-publish", outFileName: "dist.zip" }),
            // TODO: remove zip plugin.
        ],
        build: {
            rolldownOptions: {
                input: {
                    sidepanel: "/src/background-service/ui/sidepanel.html",
                    options: "/src/background-service/ui/options.html",
                },
                // onwarn(warning, warn) {
                //     // Suppress “Module level directives cause errors when bundled” warnings
                //     if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
                //         return;
                //     }
                //     warn(warning);
                // },
            },
        },
        server: {
            cors: {
                origin: [/chrome-extension:\/\//],
            },
        },
    };
});
