import { DurableObject } from 'cloudflare:workers';
import type { MannaEnv } from './env';
import { initializeSchema } from './schema';

export class MannaRoom extends DurableObject<MannaEnv> {
  constructor(ctx: DurableObjectState, env: MannaEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      initializeSchema(ctx.storage.sql);
    });
  }

  async health(): Promise<{ ok: true }> {
    this.ctx.storage.sql
      .exec<{ version: number }>('SELECT MAX(id) AS version FROM _sql_schema_migrations')
      .one();
    return { ok: true };
  }
}
