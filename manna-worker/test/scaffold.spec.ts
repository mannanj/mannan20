import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { MannaRoom } from '../src/room';

describe('Manna Worker foundation', () => {
  it('answers the public health route', async () => {
    const response = await SELF.fetch('https://manna.test/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns a redacted JSON 404 for unknown routes', async () => {
    const response = await SELF.fetch('https://manna.test/private/missing');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'not_found' });
  });

  it('initializes an account room with its complete v1 schema', async () => {
    const stub = env.MANNA_ROOM.getByName('scaffold-account');

    expect(await stub.health()).toEqual({ ok: true });

    await runInDurableObject(stub, async (instance: MannaRoom, state) => {
      expect(instance).toBeInstanceOf(MannaRoom);
      const tables = state.storage.sql
        .exec<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .toArray()
        .map(({ name }) => name);

      expect(tables).toEqual(
        expect.arrayContaining([
          '_sql_schema_migrations',
          'devices',
          'enrollments',
          'events',
          'project_snapshots',
          'socket_tickets',
        ]),
      );
    });
  });
});
