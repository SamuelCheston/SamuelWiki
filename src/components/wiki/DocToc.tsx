import { Box, Link as ChakraLink, Stack, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import type { MarkdownHeading } from "@/features/wiki/markdown"

type DocTocProps = {
  headings: MarkdownHeading[]
}

export function DocToc({ headings }: DocTocProps) {
  const [activeId, setActiveId] = useState<string>()

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (elements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]

        if (visibleEntry?.target.id) {
          setActiveId(visibleEntry.target.id)
        }
      },
      {
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 0.2, 0.5, 1],
      },
    )

    for (const element of elements) {
      observer.observe(element)
    }

    setActiveId(elements[0].id)

    return () => {
      observer.disconnect()
    }
  }, [headings])

  if (headings.length === 0) {
    return null
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="2xl"
      p={5}
      bg="bg.panel"
      boxShadow="sm"
      alignSelf="start"
      position={{ xl: "sticky" }}
      top={{ xl: "24px" }}
      display={{ base: "none", xl: "block" }}
    >
      <Stack gap={3}>
        <Text fontSize="sm" fontWeight="semibold">
          页内目录
        </Text>
        <Stack gap={1}>
          {headings.map((heading) => (
            <ChakraLink
              key={heading.id}
              href={`#${heading.id}`}
              display="block"
              px={3}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              color={activeId === heading.id ? "colorPalette.fg" : "fg.muted"}
              bg={activeId === heading.id ? "colorPalette.subtle" : "transparent"}
              fontWeight={activeId === heading.id ? "semibold" : "normal"}
              _hover={{ bg: "bg.muted", color: "fg.default" }}
              ps={heading.depth === 1 ? 3 : heading.depth === 2 ? 5 : 7}
            >
              {heading.text}
            </ChakraLink>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}
