# semanticGIS-org

The [Quartz](https://quartz.jzhao.xyz/) static site that builds and publishes **semanticgis.org** via GitHub Pages.

This repo holds the site engine and configuration only. It does **not** contain the site's
content — that lives in a separate private Obsidian vault and is pulled in fresh on every
deploy (see below).

## How content gets here

The published content comes from the `40 SemanticGIS/` folder of the private
[`Esbern/work-projects`](https://github.com/Esbern/work-projects) vault repo. It is **not**
committed to this repo — `content/` is gitignored and only ever exists locally (for local
preview) or transiently inside a GitHub Actions run.

On every deploy, the workflow:

1. Checks out this repo.
2. Does a sparse, read-only checkout of `Esbern/work-projects`, limited to the `40 SemanticGIS/`
   folder only (nothing else in that private vault is ever fetched).
3. `rsync`s that folder into `content/` here (excluding `Data/templates/`, which holds Obsidian
   plugin templates, not real content).
4. Builds the Quartz site and deploys it to GitHub Pages.

So `content/` in this repo is always a rebuilt mirror of the vault's `40 SemanticGIS/` folder at
deploy time, never hand-edited here. To change what's published, edit the notes in the vault
(including the vault's own `40 SemanticGIS/index.md`, which is the site's homepage) and
trigger a deploy.

## Build & deploy workflow

Everything is in a single file: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

- **Triggers:** push to `main`, or manually via `workflow_dispatch`
  (`gh workflow run deploy-pages.yml --repo Esbern/semanticGIS-org`, or the "Run workflow"
  button under the Actions tab).
- **Auth:** a fine-grained GitHub PAT scoped to `Esbern/work-projects` only, `Contents: Read-only`,
  stored as the repo secret `WORK_PROJECTS_PAT`. It has no other permissions and cannot write
  to the vault.
- **Build:** `node quartz/bootstrap-cli.mjs build` (Quartz v4.5.1, output directory `public/`).
- **Deploy:** GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages` (the
  "Build with GitHub Actions" Pages source, configured under Settings → Pages — there's no
  `CNAME` file in this repo; the custom domain `semanticgis.org` is set directly in that
  Settings page).

## Quartz configuration

- [`quartz.config.ts`](quartz.config.ts) — site-wide configuration: plugins, transformers, base URL.
- [`quartz.layout.ts`](quartz.layout.ts) — page layout and components (Explorer sidebar, search,
  graph view, etc.).
- [`quartz/`](quartz) — the Quartz engine itself (vendored from the upstream
  [jackyzha0/quartz](https://github.com/jackyzha0/quartz) project, MIT licensed).

## Local development

`content/` is gitignored and empty by default (it's populated by the deploy workflow, not
committed). To preview locally, sync a copy of the vault's `40 SemanticGIS/` folder into
`content/` yourself, e.g.:

```sh
rsync -a --delete --exclude="Data/templates/" "/path/to/work-projects/40 SemanticGIS/" content/
npm ci
npx quartz build --serve
```
