import { defineConfig } from "vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
//@ts-ignore
import viteReact from "@vitejs/plugin-react"
import manifest from "./manifest.json";
const ReactCompilerConfig = { /* ... */ };
// https://vitejs.dev/config/
export default defineConfig(()=>{
    return {
        plugins: [
            viteReact({
            babel: {
                plugins: [
                    ["babel-plugin-react-compiler", ReactCompilerConfig],
                ],
            },
        }), , crx({ manifest: manifest as unknown as ManifestV3Export })],
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
    };
});
