import { execa } from "execa"
import { randomUUID } from "node:crypto"
import { delimiter } from "node:path"
import { fileURLToPath } from "node:url"

type RpcError = {
  code: string
  message: string
}

type RpcResponse<T> =
  | { id: string; ok: true; result: T }
  | { id: string; ok: false; error: RpcError }

export async function callPython<T>(method: string, params: unknown): Promise<T> {
  const id = randomUUID()
  const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url))
  const pythonPath = [repoRoot, process.env.PYTHONPATH].filter(Boolean).join(delimiter)
  const child = execa("python3", ["-m", "hermes_lifecycle.rpc"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PYTHONPATH: pythonPath,
    },
  })

  child.stdin?.write(JSON.stringify({ id, method, params }) + "\n")
  child.stdin?.end()

  const { stdout } = await child
  const response = JSON.parse(stdout) as RpcResponse<T>
  if (!response.ok) {
    throw new Error(`${response.error.code}: ${response.error.message}`)
  }
  return response.result
}
