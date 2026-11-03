import { componentRegistry } from "./quartz/components/registry"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

// Leaves, Realisations and templates are reached through SPHERE, the dataset folders and
// links rather than browsed as folders, so the Explorer hides them (their pages stay
// published). Quartz 5 lowercases slugs, hence the lowercase names. The filter is
// serialised to the browser, so it must be self-contained. (The docs' ExternalPlugin
// import only exists for git-installed plugins; ours come from npm.)
componentRegistry.setOptionOverrides("explorer", {
  filterFn: (node: { slugSegment: string }) =>
    !["tags", "leaves", "realisations", "templates"].includes(node.slugSegment),
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
