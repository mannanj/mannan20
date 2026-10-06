import type { OwnerEnv, WorkerEnv } from "../src/types";

declare module "cloudflare:test" {
  interface ProvidedEnv extends WorkerEnv, OwnerEnv {}
}
