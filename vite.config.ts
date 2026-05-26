import { paraglideVitePlugin } from "@inlang/paraglide-js"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
    server: {
        allowedHosts: true,
    },
    plugins: [
        sveltekit(),
        paraglideVitePlugin({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide",
            strategy: ["url", "cookie", "baseLocale"],
        }),
    ],
})
