import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Heading,
  HStack,
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import {
  Link as RouterLink,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom"
import { MarkdownRenderer } from "@/components/wiki/MarkdownRenderer"
import { ProjectCard } from "@/components/wiki/ProjectCard"
import { loadWikiPageContent } from "@/generated/wiki-index"
import type { WikiPageMeta } from "@/features/wiki/types"
import { getWikiPage, getWikiProject, getWikiProjects } from "@/features/wiki/wiki"

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<HomePage />} />
        <Route path="projects/:group/:project" element={<ProjectPage />} />
        <Route
          path="projects/:group/:project/:pageSlug"
          element={<DocPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function AppShell() {
  const projects = getWikiProjects()

  return (
    <Box minH="100vh" bg="bg.canvas">
      <Container maxW="7xl" py={{ base: 6, md: 10 }}>
        <Stack gap={8}>
          <Box
            borderWidth="1px"
            borderRadius="2xl"
            px={{ base: 5, md: 8 }}
            py={{ base: 5, md: 6 }}
            bg="bg.panel"
            boxShadow="sm"
          >
            <Stack gap={4}>
              <HStack justify="space-between" align="start" wrap="wrap">
                <Box>
                  <ChakraLink asChild fontSize="2xl" fontWeight="bold">
                    <RouterLink to="/">HRPAuth Wiki</RouterLink>
                  </ChakraLink>
                  <Text color="fg.muted" mt={2}>
                    面向多项目文档沉淀的 Wiki 站点。当前已接入 {projects.length} 个项目。
                  </Text>
                </Box>
                <Button asChild colorPalette="teal">
                  <RouterLink to="/projects">浏览项目</RouterLink>
                </Button>
              </HStack>

              <HStack gap={2} wrap="wrap">
                {projects.map((project) => (
                  <ChakraLink
                    key={project.id}
                    asChild
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    bg="bg.muted"
                    fontSize="sm"
                  >
                    <RouterLink to={project.href}>{project.title}</RouterLink>
                  </ChakraLink>
                ))}
              </HStack>
            </Stack>
          </Box>

          <Outlet />
        </Stack>
      </Container>
    </Box>
  )
}

function HomePage() {
  const projects = getWikiProjects()

  return (
    <Stack gap={6}>
      <Box>
        <Heading size="2xl">项目 Wiki</Heading>
        <Text color="fg.muted" mt={2}>
          每个二级目录对应一个项目 Wiki，首页会自动从 `wiki/` 内容目录生成。
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </Grid>
    </Stack>
  )
}

function ProjectPage() {
  const { group = "", project = "" } = useParams()
  const projectMeta = getWikiProject(group, project)
  const indexPage = getWikiPage(group, project, "")
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function run() {
      if (!indexPage) {
        setIsLoading(false)
        return
      }

      const nextContent = await loadWikiPageContent(indexPage.moduleKey)

      if (active) {
        setContent(nextContent)
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    void run()

    return () => {
      active = false
    }
  }, [indexPage])

  if (!projectMeta) {
    return <NotFoundContent />
  }

  const docs = projectMeta.pages.filter((page) => page.slug !== "")

  return (
    <Grid templateColumns={{ base: "1fr", lg: "280px 1fr" }} gap={6}>
      <ProjectSidebar
        title={projectMeta.title}
        homeHref={projectMeta.href}
        description={projectMeta.description}
        pages={projectMeta.pages}
      />

      <Stack gap={6}>
        <Box
          borderWidth="1px"
          borderRadius="2xl"
          p={{ base: 5, md: 6 }}
          bg="bg.panel"
          boxShadow="sm"
        >
          <Stack gap={3}>
            <HStack gap={2} wrap="wrap">
              <Badge>{projectMeta.group}</Badge>
              <Badge>{projectMeta.project}</Badge>
              <Badge>{projectMeta.pageCount} pages</Badge>
            </HStack>
            <Heading size="xl">{projectMeta.title}</Heading>
            <Text color="fg.muted">
              {projectMeta.description ?? "暂无项目描述。"}
            </Text>
          </Stack>
        </Box>

        <Box
          borderWidth="1px"
          borderRadius="2xl"
          p={{ base: 5, md: 6 }}
          bg="bg.panel"
          boxShadow="sm"
        >
          <Heading size="lg" mb={4}>
            文档列表
          </Heading>
          <Stack gap={3}>
            {docs.map((page) => (
              <Box key={page.id}>
                <ChakraLink asChild fontWeight="medium">
                  <RouterLink to={page.href}>{page.title}</RouterLink>
                </ChakraLink>
                {page.description ? (
                  <Text color="fg.muted" mt={1} fontSize="sm">
                    {page.description}
                  </Text>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box
          borderWidth="1px"
          borderRadius="2xl"
          p={{ base: 5, md: 6 }}
          bg="bg.panel"
          boxShadow="sm"
        >
          <Heading size="lg" mb={4}>
            项目首页
          </Heading>
          {isLoading ? (
            <Spinner />
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </Box>
      </Stack>
    </Grid>
  )
}

function DocPage() {
  const { group = "", project = "", pageSlug } = useParams()
  const projectMeta = getWikiProject(group, project)
  const page = getWikiPage(group, project, pageSlug)
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function run() {
      if (!page) {
        setIsLoading(false)
        return
      }

      const nextContent = await loadWikiPageContent(page.moduleKey)

      if (active) {
        setContent(nextContent)
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    void run()

    return () => {
      active = false
    }
  }, [page])

  if (!projectMeta || !page) {
    return <NotFoundContent />
  }

  return (
    <Grid templateColumns={{ base: "1fr", lg: "280px 1fr" }} gap={6}>
      <ProjectSidebar
        title={projectMeta.title}
        homeHref={projectMeta.href}
        description={projectMeta.description}
        pages={projectMeta.pages}
      />

      <Box
        borderWidth="1px"
        borderRadius="2xl"
        p={{ base: 5, md: 6 }}
        bg="bg.panel"
        boxShadow="sm"
      >
        <Stack gap={5}>
          <Box>
            <Text color="fg.muted" fontSize="sm" mb={2}>
              {group} / {project}
            </Text>
            <Heading size="xl">{page.title}</Heading>
            {page.description ? (
              <Text color="fg.muted" mt={3}>
                {page.description}
              </Text>
            ) : null}
            <DocMeta
              updatedAt={page.updatedAt}
              tags={page.tags}
              sourcePath={page.sourcePath}
            />
          </Box>

          {isLoading ? <Spinner /> : <MarkdownRenderer content={content} />}
        </Stack>
      </Box>
    </Grid>
  )
}

function ProjectSidebar(props: {
  title: string
  homeHref: string
  description?: string
  pages: WikiPageMeta[]
}) {
  const navPages = useMemo(
    () => props.pages.filter((page) => page.slug !== ""),
    [props.pages],
  )

  return (
    <Box
      borderWidth="1px"
      borderRadius="2xl"
      p={5}
      bg="bg.panel"
      boxShadow="sm"
      alignSelf="start"
      position={{ lg: "sticky" }}
      top={{ lg: "24px" }}
    >
      <Stack gap={4}>
        <Box>
          <Heading size="md">{props.title}</Heading>
          {props.description ? (
            <Text color="fg.muted" mt={2} fontSize="sm">
              {props.description}
            </Text>
          ) : null}
        </Box>

        <Button asChild size="sm" variant="outline">
          <RouterLink to={props.homeHref}>
            返回项目首页
          </RouterLink>
        </Button>

        <Stack gap={3}>
          {navPages.map((page) => (
            <Box key={page.id}>
              <ChakraLink asChild>
                <RouterLink to={page.href}>{page.title}</RouterLink>
              </ChakraLink>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

function DocMeta(props: {
  updatedAt?: string
  tags: string[]
  sourcePath: string
}) {
  return (
    <HStack gap={2} wrap="wrap" mt={4}>
      {props.updatedAt ? <Badge>更新于 {props.updatedAt}</Badge> : null}
      <Badge>{props.sourcePath}</Badge>
      {props.tags.map((tag) => (
        <Badge key={tag} variant="subtle">
          #{tag}
        </Badge>
      ))}
    </HStack>
  )
}

function NotFoundPage() {
  return <NotFoundContent />
}

function NotFoundContent() {
  return (
    <Box
      borderWidth="1px"
      borderRadius="2xl"
      p={{ base: 6, md: 10 }}
      bg="bg.panel"
      boxShadow="sm"
    >
      <Stack gap={4}>
        <Heading size="lg">页面不存在</Heading>
        <Text color="fg.muted">
          当前路径没有匹配到对应的 Wiki 项目或文档。
        </Text>
        <Button asChild w="fit-content" colorPalette="teal">
          <RouterLink to="/">返回首页</RouterLink>
        </Button>
      </Stack>
    </Box>
  )
}

export default App
