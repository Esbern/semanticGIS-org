// Keep the Quartz 4 addresses of semanticgis.org working after the move to Quartz 5.
//
// Quartz 5 lowercases every published path and turns folder notes (QGIS/QGIS.md) into the
// folder's index, so the old mixed-case addresses would answer 404. Its AliasRedirects plugin
// covers ordinary notes, but not folder pages, folder notes or files: the QGIS plugin reads its
// catalogue from /Data/assets/, streams reference GeoPackages from there, and students run the
// macOS patch script by its old address.
//
// legacy-urls.txt lists every file the last Quartz 4 build published (social images and the
// hashed bundles left out). After the build, each one that no longer exists gets a redirect
// page (.html) or a copy of the file (everything else) at its old path. Old addresses whose
// note has since been removed are listed and skipped.
//
//   node scripts/legacy-urls.mjs [public]
//
// Run it on a case-sensitive file system (the GitHub runner); on macOS's default one every
// old path already "exists" under its lowercase twin and nothing is written.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(process.argv[2] ?? "public")
const legacy = fs.readFileSync(path.join(here, "legacy-urls.txt"), "utf8").split("\n").filter(Boolean).map((rel) => rel.normalize("NFC"))

function exists(rel) {
  // A case-sensitive check, so Data/x is not taken for data/x on a case-insensitive disk.
  let dir = out
  for (const segment of rel.split("/")) {
    let names
    try {
      names = fs.readdirSync(dir)
    } catch {
      return false
    }
    // macOS and Linux may spell å, æ, ø with different byte sequences (NFD/NFC).
    const name = names.find((n) => n.normalize("NFC") === segment)
    if (!name) return false
    dir = path.join(dir, name)
  }
  return true
}

function target(rel) {
  const segments = rel.toLowerCase().split("/")
  const last = segments.length - 1
  if (segments[last].endsWith(".html") && last > 0 && segments[last].slice(0, -5) === segments[last - 1]) {
    segments[last] = "index.html" // folder note: qgis/qgis.html is now qgis/index.html
  }
  const candidate = segments.join("/")
  return exists(candidate) ? candidate : null
}

function onDisk(rel) {
  // The path as the file system spells it, for copying.
  let dir = out
  for (const segment of rel.split("/")) {
    dir = path.join(dir, fs.readdirSync(dir).find((n) => n.normalize("NFC") === segment))
  }
  return dir
}

function redirectPage(to) {
  const url = "/" + to.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "")
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${url}</title>
<link rel="canonical" href="https://semanticgis.org${url}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${url}">
</head><body><p>Moved to <a href="${url}">${url}</a>.</p></body></html>
`
}

let redirects = 0
let copies = 0
const unresolved = []
for (const rel of legacy) {
  if (exists(rel)) continue
  const to = target(rel)
  if (!to) {
    unresolved.push(rel)
    continue
  }
  const dest = path.join(out, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (rel.endsWith(".html")) {
    fs.writeFileSync(dest, redirectPage(to))
    redirects++
  } else {
    fs.copyFileSync(onDisk(to), dest)
    copies++
  }
}
console.log(`Legacy URLs: ${redirects} redirect pages, ${copies} copied files, ${unresolved.length} no longer published`)
for (const rel of unresolved) console.log(`  gone: ${rel}`)
