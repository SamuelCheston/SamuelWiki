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
import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import {
  Link as RouterLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom"
import { ProjectCard } from "@/components/wiki/ProjectCard"
import { SearchBox } from "@/components/wiki/SearchBox"
import { loadWikiPageContent } from "@/generated/wiki-index"
import { extractMarkdownHeadings } from "@/features/wiki/markdown"
import type { WikiPageMeta, WikiProjectMeta } from "@/features/wiki/types"
import {
  getAdjacentPages,
  groupProjectPages,
  getWikiPage,
  getWikiProject,
  getWikiProjects,
  searchWikiProjects,
} from "@/features/wiki/wiki"

const LazyDocToc = lazy(async () => {
  const module = await import("@/components/wiki/DocToc")

  return { default: module.DocToc }
})

const LazyMarkdownRenderer = lazy(async () => {
  const module = await import("@/components/wiki/MarkdownRenderer")

  return { default: module.MarkdownRenderer }
})

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
          <Outlet />
        </Stack>
      </Container>
    </Box>
  )
}

function HomePage() {
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchWikiProjects(query), [query])

  return (
    <Stack gap={6}>
      <Box>
        <Heading size="2xl">项目 Wiki</Heading>
        <Text color="fg.muted" mt={2}>
          每个二级目录对应一个项目 Wiki，首页会自动从 `wiki/` 内容目录生成。
        </Text>
      </Box>

      <SearchBox value={query} onChange={setQuery} />

      <Text color="fg.muted" fontSize="sm">
        {query.trim()
          ? `找到 ${results.length} 个匹配项目`
          : `当前共 ${results.length} 个项目`}
      </Text>

      {results.length > 0 ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
          {results.map((result) => (
            <ProjectCard
              key={result.project.id}
              project={result.project}
              matchedPages={result.matchedPages}
              matchedFields={result.matchedFields}
              queryActive={Boolean(query.trim())}
            />
          ))}
        </Grid>
      ) : (
        <EmptyState
          title="没有找到匹配项目"
          description="试试项目名、页面标题或标签关键字。"
        />
      )}
    </Stack>
  )
}

function ProjectPage() {
  const { group = "", project = "" } = useParams()
  const projectMeta = getWikiProject(group, project)
  const indexPage = getWikiPage(group, project, "")

  if (!projectMeta || !indexPage) {
    return <NotFoundContent />
  }

  return <WikiReaderPage projectMeta={projectMeta} page={indexPage} />
}

function DocPage() {
  const { group = "", project = "", pageSlug } = useParams()
  const projectMeta = getWikiProject(group, project)
  const page = getWikiPage(group, project, pageSlug)

  if (!projectMeta || !page) {
    return <NotFoundContent />
  }

  return <WikiReaderPage projectMeta={projectMeta} page={page} />
}

function WikiReaderPage(props: {
  projectMeta: WikiProjectMeta
  page: WikiPageMeta
}) {
  const { content, isLoading } = useWikiContent(props.page.moduleKey)
  const headings = useMemo(
    () => extractMarkdownHeadings(content),
    [content],
  )
  const { previousPage, nextPage } = useMemo(
    () => getAdjacentPages(props.projectMeta.pages, props.page.slug),
    [props.projectMeta.pages, props.page.slug],
  )

  return (
    <Stack gap={4}>
      <MobileProjectNav projectMeta={props.projectMeta} />

      <Grid
        templateColumns={{
          base: "1fr",
          lg: "280px minmax(0, 1fr)",
          xl: "280px minmax(0, 1fr) 240px",
        }}
        gap={6}
      >
        <Box display={{ base: "none", lg: "block" }}>
          <ProjectSidebar projectMeta={props.projectMeta} />
        </Box>

        <Box
          borderWidth="1px"
          borderRadius="2xl"
          p={{ base: 5, md: 6 }}
          bg="bg.panel"
          boxShadow="sm"
          minW={0}
        >
          <Stack gap={5}>
            <Breadcrumbs
              group={props.projectMeta.group}
              project={props.projectMeta.project}
              projectTitle={props.projectMeta.title}
              currentPageTitle={props.page.title}
              projectHref={props.projectMeta.href}
              currentHref={props.page.href}
            />

            <Box>
              <Heading size="xl">{props.page.title}</Heading>
              {props.page.description ? (
                <Text color="fg.muted" mt={3}>
                  {props.page.description}
                </Text>
              ) : null}
              <DocMeta
                updatedAt={props.page.updatedAt ?? props.projectMeta.updatedAt}
                tags={props.page.tags}
                sourcePath={props.page.sourcePath}
              />
            </Box>

            {isLoading ? (
              <Spinner />
            ) : (
              <Suspense fallback={<Spinner />}>
                <LazyMarkdownRenderer content={content} />
              </Suspense>
            )}

            <AdjacentNav
              previousPage={previousPage}
              nextPage={nextPage}
            />
          </Stack>
        </Box>

        <Suspense fallback={null}>
          <LazyDocToc headings={headings} />
        </Suspense>
      </Grid>
    </Stack>
  )
}

function useWikiContent(moduleKey: string) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function run() {
      const nextContent = await loadWikiPageContent(moduleKey)

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
  }, [moduleKey])

  return {
    content,
    isLoading,
  }
}

function ProjectSidebar(props: {
  projectMeta: WikiProjectMeta
}) {
  const location = useLocation()
  const { indexPage, docPages } = useMemo(
    () => groupProjectPages(props.projectMeta),
    [props.projectMeta],
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
          <Heading size="md">{props.projectMeta.title}</Heading>
          {props.projectMeta.description ? (
            <Text color="fg.muted" mt={2} fontSize="sm">
              {props.projectMeta.description}
            </Text>
          ) : null}
        </Box>

        <Box>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              目录树
            </Text>
            <Badge variant="subtle">{docPages.length} docs</Badge>
          </HStack>

          <Stack
            gap={3}
            pl={1}
            borderInlineStartWidth="1px"
            borderColor="border.muted"
          >
            <Box>
              <Text
                fontSize="xs"
                color="fg.muted"
                textTransform="uppercase"
                letterSpacing="0.08em"
                mb={2}
                pl={3}
              >
                概览
              </Text>
              <Stack gap={1}>
                <SidebarTreeItem
                  href={props.projectMeta.href}
                  label={indexPage?.title ?? "项目首页"}
                  isActive={location.pathname === props.projectMeta.href}
                />
              </Stack>
            </Box>

            {docPages.length > 0 ? (
              <Box pl={4}>
                <Text
                  fontSize="xs"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                  mb={2}
                >
                  文档
                </Text>
                <Stack gap={1}>
                  {docPages.map((page) => (
                    <SidebarTreeItem
                      key={page.id}
                      href={page.href}
                      label={page.title}
                      isActive={location.pathname === page.href}
                    />
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </Box>

        <Button asChild size="sm" variant="outline">
          <RouterLink to="/projects">返回项目列表</RouterLink>
        </Button>
      </Stack>
    </Box>
  )
}

function MobileProjectNav(props: {
  projectMeta: WikiProjectMeta
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <HStack display={{ base: "flex", lg: "none" }} justify="space-between">
        <Stack gap={0}>
          <Text color="fg.muted" fontSize="xs">
            项目导航
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {props.projectMeta.title}
          </Text>
        </Stack>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          打开目录
        </Button>
      </HStack>

      {open ? (
        <Box
          position="fixed"
          inset={0}
          zIndex={30}
          bg="blackAlpha.600"
          display={{ base: "block", lg: "none" }}
          onClick={() => setOpen(false)}
        >
          <Box
            width="min(88vw, 360px)"
            height="100%"
            bg="bg.canvas"
            p={4}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack gap={4}>
              <HStack justify="space-between">
                <Heading size="sm">项目导航</Heading>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  关闭
                </Button>
              </HStack>

              <ProjectSidebar projectMeta={props.projectMeta} />
            </Stack>
          </Box>
        </Box>
      ) : null}
    </>
  )
}

function SidebarTreeItem(props: {
  href: string
  label: string
  isActive: boolean
}) {
  return (
    <ChakraLink
      asChild
      display="block"
      px={3}
      py={2}
      borderRadius="lg"
      bg={props.isActive ? "colorPalette.subtle" : "transparent"}
      color={props.isActive ? "colorPalette.fg" : "fg.default"}
      fontWeight={props.isActive ? "semibold" : "medium"}
      _hover={{ bg: "bg.muted" }}
    >
      <RouterLink to={props.href}>{props.label}</RouterLink>
    </ChakraLink>
  )
}

function Breadcrumbs(props: {
  group: string
  project: string
  projectTitle: string
  currentPageTitle: string
  projectHref: string
  currentHref: string
}) {
  return (
    <HStack gap={2} wrap="wrap" color="fg.muted" fontSize="sm">
      <ChakraLink asChild>
        <RouterLink to="/">首页</RouterLink>
      </ChakraLink>
      <Text>/</Text>
      <ChakraLink asChild>
        <RouterLink to="/projects">项目</RouterLink>
      </ChakraLink>
      <Text>/</Text>
      <Text>{props.group}</Text>
      <Text>/</Text>
      <ChakraLink asChild>
        <RouterLink to={props.projectHref}>{props.projectTitle}</RouterLink>
      </ChakraLink>
      {props.currentHref !== props.projectHref ? (
        <>
          <Text>/</Text>
          <Text color="fg.default">{props.currentPageTitle}</Text>
        </>
      ) : null}
    </HStack>
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

function AdjacentNav(props: {
  previousPage?: WikiPageMeta
  nextPage?: WikiPageMeta
}) {
  if (!props.previousPage && !props.nextPage) {
    return null
  }

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
      <AdjacentCard
        label="上一篇"
        page={props.previousPage}
        align="start"
      />
      <AdjacentCard
        label="下一篇"
        page={props.nextPage}
        align="end"
      />
    </Grid>
  )
}

function AdjacentCard(props: {
  label: string
  page?: WikiPageMeta
  align: "start" | "end"
}) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      p={4}
      textAlign={props.align}
      opacity={props.page ? 1 : 0.6}
    >
      <Text color="fg.muted" fontSize="sm">
        {props.label}
      </Text>
      {props.page ? (
        <ChakraLink asChild fontWeight="semibold" mt={1} display="inline-block">
          <RouterLink to={props.page.href}>{props.page.title}</RouterLink>
        </ChakraLink>
      ) : (
        <Text mt={1}>已到边界</Text>
      )}
    </Box>
  )
}

function NotFoundPage() {
  return <NotFoundContent />
}

function EmptyState(props: {
  title: string
  description: string
}) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="2xl"
      p={{ base: 6, md: 10 }}
      bg="bg.panel"
      boxShadow="sm"
    >
      <Stack gap={3}>
        <Heading size="md">{props.title}</Heading>
        <Text color="fg.muted">{props.description}</Text>
      </Stack>
    </Box>
  )
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
