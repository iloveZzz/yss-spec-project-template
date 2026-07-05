#!/usr/bin/env node

const { runCli } = require("../src/cli");

(async () => {
  await runCli(process.argv.slice(2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
