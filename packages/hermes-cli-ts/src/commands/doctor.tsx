import { Command } from "commander"
import { render } from "ink"

import { callPython } from "../bridge/pythonBridge.js"
import type { ShellBrand } from "../shellBrand.js"
import { DoctorView } from "../ui/DoctorView.js"

type DoctorCheck = {
  code: string
  status: string
  message: string
}

type DoctorResult = {
  checks: DoctorCheck[]
}

export function createDoctorCommand(shellBrand: ShellBrand) {
  return new Command("doctor")
    .description("Check local YSSComet environment through the Python core")
    .option("--json", "print raw JSON")
    .action(async (options: { json?: boolean }) => {
      const root = process.env.INIT_CWD ?? process.cwd()
      const result = await callPython<DoctorResult>("doctor", { root })
      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      render(<DoctorView shellBrand={shellBrand} checks={result.checks} />)
    })
}
