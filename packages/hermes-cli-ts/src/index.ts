#!/usr/bin/env node
import { Command } from "commander"

import { createDoctorCommand } from "./commands/doctor.js"
import { detectShellBrand } from "./shellBrand.js"

const shellBrand = detectShellBrand(process.argv[1])
const program = new Command()

program.name(shellBrand.bin).description(`${shellBrand.label} interactive CLI shell`).version("0.1.0")
program.addCommand(createDoctorCommand(shellBrand))
program.parse()
