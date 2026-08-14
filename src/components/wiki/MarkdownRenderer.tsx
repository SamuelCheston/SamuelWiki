import { Box, Code } from "@chakra-ui/react"
import type { ReactNode } from "react"
import { Suspense, createElement, lazy, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { slugifyHeading } from "@/features/wiki/markdown"

type MarkdownRendererProps = {
  content: string
}

const LazyCodeBlock = lazy(() => import("@/components/wiki/CodeBlock"))

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((item) => extractText(item)).join("")
  }

  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props

    return extractText(props?.children ?? "")
  }

  return ""
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const markdownComponents = useMemo(() => {
    const headingCounts = new Map<string, number>()

    function getHeadingId(children: ReactNode) {
      const text = extractText(children)
      const baseId = slugifyHeading(text)

      if (!baseId) {
        return undefined
      }

      const nextCount = (headingCounts.get(baseId) ?? 0) + 1
      headingCounts.set(baseId, nextCount)

      return nextCount === 1 ? baseId : `${baseId}-${nextCount}`
    }

    function createHeading(tag: "h1" | "h2" | "h3") {
      return function HeadingComponent(props: { children?: ReactNode }) {
        const id = getHeadingId(props.children)

        return createElement(tag, { id }, props.children)
      }
    }

    return {
      h1: createHeading("h1"),
      h2: createHeading("h2"),
      h3: createHeading("h3"),
      code(props: {
        children?: ReactNode
        className?: string
        inline?: boolean
      }) {
        const match = /language-(\w+)/.exec(props.className ?? "")
        const code = String(props.children ?? "").replace(/\n$/, "")

        if (!props.inline && match) {
          return (
            <Suspense fallback={<Code whiteSpace="pre-wrap">{code}</Code>}>
              <LazyCodeBlock code={code} language={match[1]} />
            </Suspense>
          )
        }

        return <Code>{props.children}</Code>
      },
    }
  }, [])

  return (
    <Box
      css={{
        lineHeight: 1.8,
        "& h1, & h2, & h3": {
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
          fontWeight: 700,
          lineHeight: 1.3,
        },
        "& h1": { fontSize: "2rem" },
        "& h2": { fontSize: "1.5rem" },
        "& h3": { fontSize: "1.25rem" },
        "& p, & ul, & ol, & blockquote": {
          marginBottom: "1rem",
        },
        "& ul, & ol": {
          paddingInlineStart: "1.5rem",
        },
        "& li + li": {
          marginTop: "0.25rem",
        },
        "& pre": {
          overflowX: "auto",
          padding: "1rem",
          borderRadius: "0.75rem",
          background: "var(--chakra-colors-bg-muted)",
          marginBottom: "1rem",
        },
        "& code": {
          fontSize: "0.9em",
        },
        "& :not(pre) > code": {
          paddingInline: "0.3rem",
          paddingBlock: "0.15rem",
          borderRadius: "0.35rem",
          background: "var(--chakra-colors-bg-muted)",
        },
        "& blockquote": {
          paddingInlineStart: "1rem",
          borderInlineStart: "3px solid var(--chakra-colors-border-emphasized)",
          color: "var(--chakra-colors-fg-muted)",
        },
        "& a": {
          color: "var(--chakra-colors-color-palette-solid)",
          textDecoration: "underline",
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </Box>
  )
}
