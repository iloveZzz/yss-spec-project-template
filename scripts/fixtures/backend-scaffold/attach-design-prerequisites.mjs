#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { attachDesignPrerequisites } from "./design-prerequisites.mjs";

const contractFile = process.argv[2] && path.resolve(process.argv[2]);
if (!contractFile) {
  process.stderr.write("用法: attach-design-prerequisites.mjs <contract.json> [required|not-applicable]\n");
  process.exitCode = 1;
} else {
  const contract = JSON.parse(readFileSync(contractFile, "utf8"));
  attachDesignPrerequisites(path.dirname(contractFile), contract, { dataImpact: process.argv[3] ?? "not-applicable" });
  writeFileSync(contractFile, `${JSON.stringify(contract, null, 2)}\n`);
  process.stdout.write(`${contract.lifecycle_approval_ref}\n`);
}
