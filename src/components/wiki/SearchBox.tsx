import { Box, Input, InputGroup } from "@chakra-ui/react"

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <Box maxW="480px">
      <InputGroup startElement="搜索">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="搜索项目、页面标题或标签"
        />
      </InputGroup>
    </Box>
  )
}
