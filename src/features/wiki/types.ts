export type WikiFrontmatter = {
  title?: string
  description?: string
  order?: number
  tags?: string[]
  updatedAt?: string
}

export type WikiPageMeta = {
  id: string
  group: string
  project: string
  slug: string
  title: string
  description?: string
  order: number
  tags: string[]
  updatedAt?: string
  sourcePath: string
  moduleKey: string
  href: string
}

export type WikiProjectMeta = {
  id: string
  group: string
  project: string
  title: string
  description?: string
  href: string
  pages: WikiPageMeta[]
  pageCount: number
  updatedAt?: string
  tags: string[]
}
