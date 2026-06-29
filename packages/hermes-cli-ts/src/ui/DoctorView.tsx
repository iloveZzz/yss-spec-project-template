import React from "react"
import { Box, Text } from "ink"

import type { ShellBrand } from "../shellBrand.js"

type DoctorCheck = {
  code: string
  status: string
  message: string
}

type DoctorViewProps = {
  shellBrand: ShellBrand
  checks: DoctorCheck[]
}

const STATUS_COLOR: Record<string, "green" | "yellow" | "red" | "white"> = {
  pass: "green",
  warn: "yellow",
  fail: "red",
}

export function DoctorView({ shellBrand, checks }: DoctorViewProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{shellBrand.label} Environment</Text>
      {checks.map((check, index) => (
        <Box key={`${check.code}-${index}`}>
          <Box width={24}>
            <Text>{check.code}</Text>
          </Box>
          <Box width={8}>
            <Text color={STATUS_COLOR[check.status] ?? "white"}>{check.status}</Text>
          </Box>
          <Text>{check.message}</Text>
        </Box>
      ))}
    </Box>
  )
}
