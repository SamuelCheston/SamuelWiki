import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"

type CodeBlockProps = {
  code: string
  language: string
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      PreTag="div"
      language={language}
      style={oneLight}
      customStyle={{
        margin: 0,
        borderRadius: "0.75rem",
        padding: "1rem",
        fontSize: "0.9rem",
      }}
    >
      {code}
    </SyntaxHighlighter>
  )
}
