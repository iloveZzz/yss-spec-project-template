import { basename } from "node:path"

export type ShellBrandName = "hermes" | "codex" | "trae"

export type ShellBrand = {
  name: ShellBrandName
  bin: string
  label: string
}

const BRANDS: Record<ShellBrandName, ShellBrand> = {
  hermes: { name: "hermes", bin: "hermes", label: "Hermes" },
  codex: { name: "codex", bin: "codex", label: "Codex" },
  trae: { name: "trae", bin: "trae", label: "Trae" },
}

export function detectShellBrand(argvBin: string | undefined): ShellBrand {
  const bin = basename(argvBin ?? "hermes").toLowerCase()
  if (bin === "codex") {
    return BRANDS.codex
  }
  if (bin === "trae") {
    return BRANDS.trae
  }
  return BRANDS.hermes
}
