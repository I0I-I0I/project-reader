import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { parse as parseSvelte } from "svelte/compiler"

export const DEFAULT_ALLOWED_DEPENDENCIES = {
    commands: [],
    documents: ["pdf"],
    library: ["commands", "documents", "pdf", "prompt", "settings"],
    notifications: [],
    pdf: ["settings"],
    prompt: ["commands"],
    settings: ["commands", "prompt"],
    viewer: ["commands", "documents", "pdf", "prompt", "settings"],
}

function walk(directory) {
    if (!fs.existsSync(directory)) return []
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name)
        if (entry.isDirectory()) return walk(target)
        return /\.(?:js|mjs|ts|svelte)$/.test(entry.name) ? [target] : []
    })
}

function scriptSources(file, source) {
    if (!file.endsWith(".svelte")) return [source]
    const ast = parseSvelte(source, { filename: file, modern: true })
    return [ast.module?.content, ast.instance?.content]
        .filter(Boolean)
        .map((script) => source.slice(script.start, script.end))
}

function importSpecifiers(file, source) {
    const specifiers = []
    for (const script of scriptSources(file, source)) {
        const sourceFile = ts.createSourceFile(
            file,
            script,
            ts.ScriptTarget.Latest,
            false,
            ts.ScriptKind.TS,
        )
        const visit = (node) => {
            if (
                (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                node.moduleSpecifier &&
                ts.isStringLiteralLike(node.moduleSpecifier)
            ) {
                specifiers.push(node.moduleSpecifier.text)
            } else if (
                ts.isCallExpression(node) &&
                node.expression.kind === ts.SyntaxKind.ImportKeyword &&
                node.arguments.length === 1 &&
                ts.isStringLiteralLike(node.arguments[0])
            ) {
                specifiers.push(node.arguments[0].text)
            }
            ts.forEachChild(node, visit)
        }
        visit(sourceFile)
    }
    return specifiers
}

export function analyzeProject(projectRoot, allowedDependencies = DEFAULT_ALLOWED_DEPENDENCIES) {
    const sourceRoot = path.join(projectRoot, "src")
    const libRoot = path.join(sourceRoot, "lib")
    const modulesRoot = path.join(libRoot, "modules")
    const location = (file) => path.relative(projectRoot, file).replaceAll(path.sep, "/")
    const area = (file) => {
        const relative = path.relative(sourceRoot, file).replaceAll(path.sep, "/")
        const moduleMatch = relative.match(/^lib\/modules\/([^/]+)(?:\/|$)/)
        if (moduleMatch) return { kind: "module", name: moduleMatch[1] }
        if (relative.startsWith("lib/shared/")) return { kind: "shared" }
        if (relative.startsWith("lib/app/")) return { kind: "app" }
        if (relative.startsWith("lib/paraglide/")) return { kind: "paraglide" }
        if (relative.startsWith("routes/")) return { kind: "routes" }
        return { kind: "other" }
    }
    const resolveImport = (importer, rawSpecifier) => {
        const specifier = rawSpecifier.split("?")[0]
        if (specifier.startsWith("$lib/")) return path.join(libRoot, specifier.slice(5))
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
            return path.resolve(path.dirname(importer), specifier)
        }
        return null
    }

    const files = walk(sourceRoot)
    const violations = []
    const moduleNames = fs.existsSync(modulesRoot)
        ? fs
              .readdirSync(modulesRoot, { withFileTypes: true })
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name)
        : []
    const graph = new Map(moduleNames.map((name) => [name, new Set()]))

    for (const moduleName of moduleNames) {
        if (!fs.existsSync(path.join(modulesRoot, moduleName, "index.ts"))) {
            violations.push(`src/lib/modules/${moduleName}: module is missing index.ts`)
        }
    }

    for (const file of files) {
        const source = fs.readFileSync(file, "utf8")
        const from = area(file)
        for (const specifier of importSpecifiers(file, source)) {
            const cleanSpecifier = specifier.split("?")[0]
            const targetPath = resolveImport(file, specifier)
            const to = targetPath ? area(targetPath) : { kind: "external" }

            if (/^\$lib\/(?:core|features)(?:\/|$)/.test(cleanSpecifier)) {
                violations.push(`${location(file)} imports removed alias ${specifier}`)
            }

            const moduleAlias = cleanSpecifier.match(/^\$lib\/modules\/([^/]+)(\/.+)$/)
            if (moduleAlias) {
                violations.push(
                    from.kind === "module" && from.name === moduleAlias[1]
                        ? `${location(file)} uses an alias for its own internals; use a relative import`
                        : `${location(file)} deep-imports ${specifier}; use $lib/modules/${moduleAlias[1]}`,
                )
            }

            if (from.kind === "shared" && ["module", "app", "routes"].includes(to.kind)) {
                violations.push(`${location(file)}: shared code may not import ${specifier}`)
            }
            if (from.kind === "module" && ["app", "routes"].includes(to.kind)) {
                violations.push(`${location(file)}: modules may not import ${specifier}`)
            }
            if (
                from.kind === "paraglide" &&
                ["module", "shared", "app", "routes"].includes(to.kind)
            ) {
                violations.push(
                    `${location(file)}: generated Paraglide code imports application code (${specifier})`,
                )
            }

            if (from.kind === "module" && to.kind === "module" && from.name !== to.name) {
                graph.get(from.name)?.add(to.name)
                if (!(allowedDependencies[from.name] ?? []).includes(to.name)) {
                    violations.push(`${location(file)}: ${from.name} may not depend on ${to.name}`)
                }
                if (cleanSpecifier !== `$lib/modules/${to.name}`) {
                    violations.push(
                        `${location(file)}: cross-module imports must use $lib/modules/${to.name}`,
                    )
                }
            }
        }
    }

    const visiting = new Set()
    const visited = new Set()
    const visit = (moduleName, trail = []) => {
        if (visiting.has(moduleName)) {
            const start = trail.indexOf(moduleName)
            violations.push(
                `module dependency cycle: ${[...trail.slice(start), moduleName].join(" -> ")}`,
            )
            return
        }
        if (visited.has(moduleName)) return
        visiting.add(moduleName)
        for (const dependency of graph.get(moduleName) ?? [])
            visit(dependency, [...trail, moduleName])
        visiting.delete(moduleName)
        visited.add(moduleName)
    }
    for (const moduleName of graph.keys()) visit(moduleName)

    return {
        files: files.length,
        modules: graph.size,
        violations: [...new Set(violations)].sort(),
    }
}

export function runCli(projectRoot = process.cwd()) {
    const result = analyzeProject(projectRoot)
    if (result.violations.length) {
        console.error(`Module boundary check failed with ${result.violations.length} violation(s):`)
        for (const violation of result.violations) console.error(`- ${violation}`)
        return 1
    }
    console.log(
        `Module boundaries valid (${result.files} source files, ${result.modules} modules).`,
    )
    return 0
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) process.exitCode = runCli()
