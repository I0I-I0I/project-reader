import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const PUBLIC_DIR = path.join(__dirname, "build")

const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
}

const server = http.createServer((req, res) => {
    let safeUrl = req.url
    try {
        safeUrl = decodeURIComponent(req.url)
    } catch {
        res.statusCode = 400;
        res.end("Bad Request")
        return
    }

    // Strip query strings or hash parameters
    const parsedPath = safeUrl.split("?")[0].split("#")[0]
    let filePath = path.join(PUBLIC_DIR, parsedPath)

    // Serve index.html if pointing to a directory
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html")
    }

    // SPA routing fallback: if the file doesn't exist, serve 200.html
    let finalPath = filePath
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        finalPath = path.join(PUBLIC_DIR, "200.html")
    }

    const ext = path.extname(finalPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    fs.readFile(finalPath, (err, content) => {
        if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" })
            res.end(`Internal Server Error: ${err.code}`)
        } else {
            res.writeHead(200, { "Content-Type": contentType })
            res.end(content, "utf-8")
        }
    })
})

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Static server running at http://0.0.0.0:${PORT}/ serving ${PUBLIC_DIR}`)
})
