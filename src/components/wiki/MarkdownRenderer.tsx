import { Box } from "@chakra-ui/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownRendererProps = {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  )
}
