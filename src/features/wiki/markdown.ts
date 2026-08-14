export type MarkdownHeading = {
  depth: 1 | 2 | 3
  text: string
  id: string
}

function normalizeHeadingText(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim()
}

export function slugifyHeading(text: string) {
  return normalizeHeadingText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = []
  const seenIds = new Map<string, number>()
  const lines = content.split("\n")
  let inCodeFence = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) {
      continue
    }

    const match = /^(#{1,3})\s+(.+)$/.exec(trimmed)

    if (!match) {
      continue
    }

    const depth = match[1].length as 1 | 2 | 3
    const text = normalizeHeadingText(match[2])
    const baseId = slugifyHeading(text)

    if (!baseId) {
      continue
    }

    const nextCount = (seenIds.get(baseId) ?? 0) + 1
    seenIds.set(baseId, nextCount)

    headings.push({
      depth,
      text,
      id: nextCount === 1 ? baseId : `${baseId}-${nextCount}`,
    })
  }

  return headings
}
