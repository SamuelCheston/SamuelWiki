import { wikiPages, wikiProjects } from "@/generated/wiki-index"

export function getWikiProjects() {
  return wikiProjects
}

export function getWikiProject(group: string, project: string) {
  return wikiProjects.find(
    (item) => item.group === group && item.project === project,
  )
}

export function getWikiPage(
  group: string,
  project: string,
  slug: string | undefined,
) {
  const normalizedSlug = slug ?? ""

  return wikiPages.find(
    (item) =>
      item.group === group &&
      item.project === project &&
      item.slug === normalizedSlug,
  )
}
