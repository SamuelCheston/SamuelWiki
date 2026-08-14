import { Button, HStack, Heading, Box, Container, Text } from "@chakra-ui/react"

function App() {
  return (
    <Container maxW="container.md" py={10}>
      <Box textAlign="center">
        <Heading mb={4}>Welcome to Chakra UI v3!</Heading>
        <Text mb={6}>This project has been successfully initialized with Vite, React, TypeScript, and Chakra UI.</Text>
        <HStack justify="center">
          <Button colorScheme="teal">Click Me</Button>
          <Button variant="outline">Learn More</Button>
        </HStack>
      </Box>
    </Container>
  )
}

export default App
