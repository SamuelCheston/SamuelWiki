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

export function searchWikiProjects(query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return wikiProjects
  }

  return wikiProjects.filter((project) => {
    const haystacks = [
      project.title,
      project.description ?? "",
      project.group,
      project.project,
      ...project.tags,
      ...project.pages.flatMap((page) => [
        page.title,
        page.description ?? "",
        ...page.tags,
      ]),
    ]

    return haystacks.some((item) =>
      item.toLowerCase().includes(normalizedQuery),
    )
  })
}

export function getAdjacentPages(
  pages: typeof wikiPages,
  slug: string,
) {
  const sortedPages = [...pages].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }

    return left.title.localeCompare(right.title, "zh-Hans-CN")
  })
  const currentIndex = sortedPages.findIndex((page) => page.slug === slug)

  if (currentIndex === -1) {
    return {
      previousPage: undefined,
      nextPage: undefined,
    }
  }

  return {
    previousPage: sortedPages[currentIndex - 1],
    nextPage: sortedPages[currentIndex + 1],
  }
}
