import { wikiPages, wikiProjects } from "@/generated/wiki-index"
import type { WikiPageMeta, WikiProjectMeta } from "@/features/wiki/types"

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
    return wikiProjects.map((project) => ({
      project,
      matchedPages: project.pages.filter((page) => page.slug !== "").slice(0, 3),
      matchedFields: [] as string[],
    }))
  }

  return wikiProjects
    .map((project) => {
      const matchedFields = new Set<string>()
      const matchedPages = project.pages.filter((page) => {
        const pageMatches =
          page.title.toLowerCase().includes(normalizedQuery) ||
          (page.description ?? "").toLowerCase().includes(normalizedQuery) ||
          page.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))

        if (pageMatches && page.slug !== "") {
          matchedFields.add("文档标题")
        }

        return pageMatches
      })

      if (project.title.toLowerCase().includes(normalizedQuery)) {
        matchedFields.add("项目名")
      }

      if ((project.description ?? "").toLowerCase().includes(normalizedQuery)) {
        matchedFields.add("项目描述")
      }

      if (
        project.group.toLowerCase().includes(normalizedQuery) ||
        project.project.toLowerCase().includes(normalizedQuery)
      ) {
        matchedFields.add("路径")
      }

      if (project.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))) {
        matchedFields.add("标签")
      }

      return {
        project,
        matchedPages: matchedPages.slice(0, 5),
        matchedFields: [...matchedFields],
      }
    })
    .filter((result) => result.matchedFields.length > 0 || result.matchedPages.length > 0)
}

export function getAdjacentPages(
  pages: WikiPageMeta[],
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

export function groupProjectPages(project: WikiProjectMeta) {
  const indexPage = project.pages.find((page) => page.slug === "")
  const docPages = project.pages.filter((page) => page.slug !== "")

  return {
    indexPage,
    docPages,
  }
}
