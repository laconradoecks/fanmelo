// Renders the app to static HTML and injects it into dist/index.html,
// so the page is visible before any JavaScript loads.
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(fileURLToPath(import.meta.url), '../..')
const htmlPath = resolve(root, 'dist/index.html')
const serverDir = resolve(root, 'dist-ssr')

const { render } = await import(pathToFileURL(resolve(serverDir, 'entry-server.js')).href)
const template = await readFile(htmlPath, 'utf8')
if (!template.includes('<!--app-html-->')) throw new Error('Placeholder <!--app-html--> missing in dist/index.html')

let html = template.replace('<!--app-html-->', render())

// Inline the (small) stylesheet so first paint needs no extra request.
const cssLink = html.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/)
if (cssLink) {
  const css = await readFile(resolve(root, 'dist', cssLink[1].slice(1)), 'utf8')
  html = html.replace(cssLink[0], () => `<style>${css}</style>`)
}

await writeFile(htmlPath, html)
await rm(serverDir, { recursive: true, force: true })
console.log('Prerendered dist/index.html')
