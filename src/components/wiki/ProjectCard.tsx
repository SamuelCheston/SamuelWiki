import { Badge, Box, HStack, Link as ChakraLink, Stack, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router-dom"
import type { WikiProjectMeta } from "@/features/wiki/types"

type ProjectCardProps = {
  project: WikiProjectMeta
}

export function ProjectCard({ project }: ProjectCardProps) {
  const previewPages = project.pages.filter((page) => page.slug !== "").slice(0, 3)

  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      p={5}
      bg="bg.panel"
      boxShadow="sm"
    >
      <Stack gap={3}>
        <HStack justify="space-between" align="start">
          <Box>
            <ChakraLink asChild fontWeight="semibold" fontSize="xl">
              <RouterLink to={project.href}>{project.title}</RouterLink>
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

        {previewPages.length > 0 ? (
          <Box>
            <Text color="fg.muted" fontSize="sm" mb={2}>
              文档预览
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
    </Box>
  )
}
