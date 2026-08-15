import { Badge, Box, HStack, Link as ChakraLink, LinkBox, LinkOverlay, Stack, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router-dom"
import type { WikiProjectMeta } from "@/features/wiki/types"

type ProjectCardProps = {
  project: WikiProjectMeta
  matchedPages?: WikiProjectMeta["pages"]
  matchedFields?: string[]
  queryActive?: boolean
}

export function ProjectCard({
  project,
  matchedPages,
  matchedFields,
  queryActive = false,
}: ProjectCardProps) {
  const previewPages = (matchedPages && matchedPages.length > 0
    ? matchedPages
    : project.pages.filter((page) => page.slug !== "").slice(0, 3))

  return (
    <LinkBox
      as="article"
      borderWidth="1px"
      borderRadius="xl"
      p={5}
      bg="bg.panel"
      boxShadow="sm"
      _hover={{ bg: "bg.muted", cursor: "pointer" }}
      transition="background 0.2s"
    >
      <Stack gap={3}>
        <HStack justify="space-between" align="start">
          <Box>
            <ChakraLink asChild fontWeight="semibold" fontSize="xl">
              <LinkOverlay asChild>
                <RouterLink to={project.href}>{project.title}</RouterLink>
              </LinkOverlay>
            </ChakraLink>
            <Text color="fg.muted" fontSize="sm">
              {project.group} / {project.project}
            </Text>
          </Box>
          <Badge>{project.pageCount} pages</Badge>
        </HStack>

        <Text color="fg.muted">
          {project.description ?? "暂无项目说明。"}
        </Text>

        <HStack gap={2} wrap="wrap">
          {project.tags.length > 0 ? (
            project.tags.map((tag) => <Badge key={tag} variant="subtle">#{tag}</Badge>)
          ) : (
            <Text color="fg.subtle" fontSize="sm">
              暂无标签
            </Text>
          )}
        </HStack>

        {queryActive && matchedFields && matchedFields.length > 0 ? (
          <HStack gap={2} wrap="wrap">
            {matchedFields.map((field) => (
              <Badge key={field} colorPalette="teal">
                命中{field}
              </Badge>
            ))}
          </HStack>
        ) : null}

        {previewPages.length > 0 ? (
          <Box>
            <Text color="fg.muted" fontSize="sm" mb={2}>
              {queryActive ? "匹配文档" : "文档预览"}
            </Text>
            <Stack gap={1}>
              {previewPages.map((page) => (
                <ChakraLink key={page.id} asChild fontSize="sm">
                  <RouterLink to={page.href}>{page.title}</RouterLink>
                </ChakraLink>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </LinkBox>
  )
}
