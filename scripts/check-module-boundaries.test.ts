import { afterEach, describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { analyzeProject } from "./check-module-boundaries.mjs"

const checker = fileURLToPath(new URL("./check-module-boundaries.mjs", import.meta.url))
const fixtures: string[] = []

function fixture(files: Record<string, string>, modules: string[] = []): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "module-boundaries-"))
    fixtures.push(root)
    for (const moduleName of modules) {
        files[`src/lib/modules/${moduleName}/index.ts`] ??= "export {}\n"
    }
    for (const [relative, contents] of Object.entries(files)) {
        const target = path.join(root, relative)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, contents)
    }
    return root
}

function cli(root: string) {
    return spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" })
}

afterEach(() => {
    for (const root of fixtures.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe("module boundary checker fixtures", () => {
    it("accepts module-root imports and same-module relative imports", () => {
        const root = fixture(
            {
                "src/lib/modules/library/feature.ts":
                    'import "./local"\nimport "$lib/modules/documents"\n',
                "src/lib/modules/library/local.ts": "export {}\n",
            },
            ["library", "documents"],
        )
        const result = cli(root)
        expect(result.status, result.stderr).toBe(0)
        expect(result.stdout).toContain("Module boundaries valid")
    })

    it.each([
        [
            "deep import",
            "src/lib/app/main.ts",
            'import "$lib/modules/library/internal"',
            "deep-imports",
        ],
        [
            "Svelte deep import",
            "src/lib/app/App.svelte",
            '<script>import "$lib/modules/library/internal"</script>',
            "deep-imports",
        ],
        [
            "cross-module relative escape",
            "src/lib/modules/library/main.ts",
            'import "../documents/internal"',
            "cross-module imports must use $lib/modules/documents",
        ],
        [
            "shared to module",
            "src/lib/shared/main.ts",
            'import "$lib/modules/library"',
            "shared code may not import",
        ],
        [
            "shared to app",
            "src/lib/shared/main.ts",
            'import "$lib/app/main"',
            "shared code may not import",
        ],
        [
            "module to route",
            "src/lib/modules/library/main.ts",
            'import "../../../routes/+page"',
            "modules may not import",
        ],
        [
            "generated back-import",
            "src/lib/paraglide/messages.js",
            'import "$lib/shared/state/x"',
            "generated Paraglide",
        ],
        ["old core alias", "src/lib/app/main.ts", 'import "$lib/core/state"', "removed alias"],
        [
            "old features alias",
            "src/lib/app/main.ts",
            'import "$lib/features/library"',
            "removed alias",
        ],
    ])("rejects %s with a useful diagnostic", (_name, file, source, diagnostic) => {
        const root = fixture({ [file]: source }, ["library", "documents"])
        const result = cli(root)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain(file)
        expect(result.stderr).toContain(diagnostic)
    })

    it("rejects disallowed dependencies", () => {
        const root = fixture(
            { "src/lib/modules/notifications/main.ts": 'import "$lib/modules/documents"' },
            ["notifications", "documents"],
        )
        const result = cli(root)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain("notifications may not depend on documents")
    })

    it("detects dependency cycles", () => {
        const root = fixture(
            {
                "src/lib/modules/library/main.ts": 'import "$lib/modules/documents"',
                "src/lib/modules/documents/main.ts": 'import "$lib/modules/library"',
            },
            ["library", "documents"],
        )
        const result = analyzeProject(root, { library: ["documents"], documents: ["library"] })
        expect(result.violations).toContain(
            "module dependency cycle: documents -> library -> documents",
        )
    })

    it("rejects modules without an index", () => {
        const root = fixture({ "src/lib/modules/library/main.ts": "export {}" })
        const result = cli(root)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain("src/lib/modules/library: module is missing index.ts")
    })

    it("ignores import-like text in comments, strings, templates, and Svelte markup", () => {
        const root = fixture({
            "src/lib/app/main.ts": [
                '// import "$lib/features/legacy"',
                "const example = 'import \"$lib/modules/viewer/internal\"'",
                'const template = `import "$lib/modules/library/internal"`',
                "void example",
                "void template",
            ].join("\n"),
            "src/lib/app/App.svelte": [
                '<script lang="ts">',
                '    // import "$lib/core/state"',
                "    const example = 'import \"$lib/modules/viewer/internal\"'",
                "</script>",
                '<p>import "$lib/features/legacy" {example}</p>',
            ].join("\n"),
        })
        const result = cli(root)
        expect(result.status, result.stderr).toBe(0)
    })

    it("accepts dynamic worker imports with query suffixes", () => {
        const root = fixture(
            {
                "src/lib/modules/viewer/main.ts":
                    'const worker = import("./worker.ts?worker")\nvoid worker\n',
                "src/lib/modules/viewer/worker.ts": "export {}\n",
            },
            ["viewer", "pdf"],
        )
        const result = cli(root)
        expect(result.status, result.stderr).toBe(0)
    })
})
