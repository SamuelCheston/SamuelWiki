import { Badge, Box, HStack } from "@chakra-ui/react"
import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import plaintext from "highlight.js/lib/languages/plaintext"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import "highlight.js/styles/github.css"

hljs.registerLanguage("bash", bash)
hljs.registerLanguage("shell", bash)
hljs.registerLanguage("sh", bash)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("js", javascript)
hljs.registerLanguage("json", json)
hljs.registerLanguage("markdown", markdown)
hljs.registerLanguage("md", markdown)
hljs.registerLanguage("plaintext", plaintext)
hljs.registerLanguage("text", plaintext)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("ts", typescript)
hljs.registerLanguage("html", xml)
hljs.registerLanguage("xml", xml)

type CodeBlockProps = {
  code: string
  language: string
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const normalizedLanguage = language.toLowerCase()
  const highlighted = hljs.getLanguage(normalizedLanguage)
    ? hljs.highlight(code, { language: normalizedLanguage }).value
    : hljs.highlight(code, { language: "plaintext" }).value

  return (
    <Box borderWidth="1px" borderRadius="xl" overflow="hidden">
      <HStack justify="space-between" px={4} py={2} bg="bg.muted">
        <Badge variant="subtle">{normalizedLanguage}</Badge>
      </HStack>
      <Box overflowX="auto" bg="white">
        <Box
          as="pre"
          m={0}
          p={4}
          fontSize="sm"
          lineHeight={1.7}
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </Box>
    </Box>
  )
}
