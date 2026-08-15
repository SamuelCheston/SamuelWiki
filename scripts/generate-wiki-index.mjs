import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, "..")
const WIKI_DIR = path.join(ROOT_DIR, "wiki")
const OUTPUT_DIR = path.join(ROOT_DIR, "src", "generated")
const OUTPUT_FILE = path.join(OUTPUT_DIR, "wiki-index.ts")
const OUTPUT_PAGES_DIR = path.join(OUTPUT_DIR, "wiki-pages")

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function listMarkdownFiles(rootDir) {
  const results = []

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath)
      }
    }
  }

  if (await pathExists(rootDir)) {
    await walk(rootDir)
  }

  return results.sort()
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 999
}

function toOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function deriveTitle(fileName) {
  const basename = fileName.replace(/\.md$/i, "")

  if (basename === "index") {
    return "Overview"
  }

  return basename
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toPosixPath(inputPath) {
  return inputPath.split(path.sep).join("/")
}

function escapeForTs(value) {
  return JSON.stringify(value)
}

function toGeneratedModuleImportPath(relativePath) {
  const withoutExtension = relativePath.replace(/\.md$/i, "")

  return `./wiki-pages/${withoutExtension}`
}

function toGeneratedModuleFilePath(relativePath) {
  return path.join(OUTPUT_PAGES_DIR, relativePath).replace(/\.md$/i, ".ts")
}

async function generate() {
  const markdownFiles = await listMarkdownFiles(WIKI_DIR)
  const violations = []
  const projectMap = new Map()
  const pageModules = []

  await fs.rm(OUTPUT_PAGES_DIR, { recursive: true, force: true })

  for (const fullPath of markdownFiles) {
    const relativePath = toPosixPath(path.relative(WIKI_DIR, fullPath))
    const segments = relativePath.split("/")

    if (segments.length !== 3) {
      violations.push(`Markdown 文件必须位于 wiki/<group>/<project>/*.md: ${relativePath}`)
      continue
    }

    const [group, project, fileName] = segments

    if (fileName.includes("/")) {
      violations.push(`非法 Markdown 路径: ${relativePath}`)
      continue
    }

    const raw = await fs.readFile(fullPath, "utf8")
    const parsed = matter(raw)
    const data = parsed.data ?? {}
    const slug = fileName === "index.md" ? "" : fileName.replace(/\.md$/i, "")
    const title = toOptionalString(data.title)
    const description = toOptionalString(data.description)
    const order = toNumber(data.order)
    const tags = toArray(data.tags)
    const updatedAt = toOptionalString(data.updatedAt)
    const moduleKey = `${group}/${project}/${fileName}`
    const href = slug
      ? `/projects/${group}/${project}/${slug}`
      : `/projects/${group}/${project}`
    const page = {
      id: `${group}/${project}/${slug || "index"}`,
      group,
      project,
      slug,
      title,
      description,
      order,
      tags,
      updatedAt,
      sourcePath: `wiki/${relativePath}`,
      moduleKey,
      href,
    }

    if (!title) {
      violations.push(`title 为必填字段: wiki/${relativePath}`)
    }

    if (
      Object.prototype.hasOwnProperty.call(data, "description") &&
      typeof data.description !== "string"
    ) {
      violations.push(`description 必须是字符串: wiki/${relativePath}`)
    }

    if (
      Object.prototype.hasOwnProperty.call(data, "order") &&
      !isNonNegativeInteger(data.order)
    ) {
      violations.push(`order 必须是大于等于 0 的整数: wiki/${relativePath}`)
    }

    if (
      Object.prototype.hasOwnProperty.call(data, "tags") &&
      (!Array.isArray(data.tags) ||
        data.tags.some((tag) => typeof tag !== "string" || !tag.trim()))
    ) {
      violations.push(`tags 必须是非空字符串数组: wiki/${relativePath}`)
    }

    if (updatedAt && !isValidDateString(updatedAt)) {
      violations.push(`updatedAt 必须使用 YYYY-MM-DD 格式: wiki/${relativePath}`)
    }

    const projectId = `${group}/${project}`

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, [])
    }

    projectMap.get(projectId).push(page)
    pageModules.push({
      moduleKey,
      importPath: toGeneratedModuleImportPath(relativePath),
      outputFile: toGeneratedModuleFilePath(relativePath),
      content: parsed.content.trim(),
    })
  }

  for (const [projectId, pages] of projectMap.entries()) {
    const [group, project] = projectId.split("/")
    const hasIndexPage = pages.some((page) => page.slug === "")

    if (!hasIndexPage) {
      violations.push(`项目缺少 index.md: wiki/${group}/${project}/`)
    }

    const seenSlugs = new Set()

    for (const page of pages) {
      const slugKey = page.slug.toLowerCase()

      if (seenSlugs.has(slugKey)) {
        violations.push(
          `项目内存在重复 slug: wiki/${group}/${project}/ (${page.slug || "index"})`,
        )
        continue
      }

      seenSlugs.add(slugKey)
    }
  }

  if (violations.length > 0) {
    throw new Error(`Wiki 目录校验失败:\n- ${violations.join("\n- ")}`)
  }

  const projects = Array.from(projectMap.entries())
    .map(([projectId, pages]) => {
      const [group, project] = projectId.split("/")
      const sortedPages = pages.sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order
        }

        return left.title.localeCompare(right.title, "zh-Hans-CN")
      })
      const indexPage = sortedPages.find((page) => page.slug === "")
      const title = indexPage?.title ?? deriveTitle(`${project}.md`)
      const description = indexPage?.description
      const updatedAt = [...sortedPages]
        .map((page) => page.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1)
      const tags = Array.from(
        new Set(sortedPages.flatMap((page) => page.tags)),
      ).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"))

      return {
        id: projectId,
        group,
        project,
        title,
        description,
        href: `/projects/${group}/${project}`,
        pages: sortedPages,
        pageCount: sortedPages.length,
        updatedAt,
        tags,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title, "zh-Hans-CN"))

  const lines = [
    "/* eslint-disable */",
    "// This file is auto-generated by scripts/generate-wiki-index.mjs",
    'import type { WikiProjectMeta, WikiPageMeta } from "@/features/wiki/types"',
    "",
    "type WikiPageLoader = () => Promise<string>",
    "",
    `export const wikiProjects: WikiProjectMeta[] = ${escapeForTs(projects)} as WikiProjectMeta[]`,
    "",
    "export const wikiPages: WikiPageMeta[] = wikiProjects.flatMap((project) => project.pages)",
    "",
    "const pageLoaders: Record<string, WikiPageLoader> = {",
    ...pageModules.flatMap((pageModule) => [
      `  ${escapeForTs(pageModule.moduleKey)}: async () => {`,
      `    const module = await import(${escapeForTs(pageModule.importPath)})`,
      "",
      "    return module.default",
      "  },",
    ]),
    "}",
    "",
    "const pageContentCache: Record<string, string> = {}",
    "",
    "export async function loadWikiPageContent(moduleKey: string) {",
    "  const cachedContent = pageContentCache[moduleKey]",
    "",
    '  if (typeof cachedContent === "string") {',
    "    return cachedContent",
    "  }",
    "",
    "  const loadContent = pageLoaders[moduleKey]",
    "",
    '  if (typeof loadContent !== "function") {',
    '    throw new Error(`Markdown content not found: ${moduleKey}`)',
    "  }",
    "",
    "  const content = await loadContent()",
    "  pageContentCache[moduleKey] = content",
    "",
    "  return content",
    "}",
    "",
  ]

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.mkdir(OUTPUT_PAGES_DIR, { recursive: true })
  await Promise.all(
    pageModules.map(async (pageModule) => {
      await fs.mkdir(path.dirname(pageModule.outputFile), { recursive: true })
      await fs.writeFile(
        pageModule.outputFile,
        [
          "/* eslint-disable */",
          "// This file is auto-generated by scripts/generate-wiki-index.mjs",
          "",
          `export default ${escapeForTs(pageModule.content)}`,
          "",
        ].join("\n"),
        "utf8",
      )
    }),
  )
  await fs.writeFile(OUTPUT_FILE, `${lines.join("\n")}`, "utf8")
}

generate().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
