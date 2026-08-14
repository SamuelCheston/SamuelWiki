import { Box, Link as ChakraLink, Stack, Text } from "@chakra-ui/react"
import type { MarkdownHeading } from "@/features/wiki/markdown"

type DocTocProps = {
  headings: MarkdownHeading[]
}

export function DocToc({ headings }: DocTocProps) {
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
              color="fg.muted"
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
