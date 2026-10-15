import { describe, expect, test } from 'bun:test';
import { listAllFiles, listBatches, type UploadsEnv } from './uploads';

function fakeEnv() {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const env = {
    UPLOADS: null,
    SHARED_UPLOADS: null,
    UPLOADS_DB: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            calls.push({ sql, binds });
            return { all: async () => ({ results: [] }) };
          },
        };
      },
    },
  } as unknown as UploadsEnv;
  return { env, calls };
}

describe('listing defaults to page batches', () => {
  test('listBatches filters on kind and defaults to page', async () => {
    const { env, calls } = fakeEnv();
    await listBatches(env);
    await listBatches(env, 'chat');
    expect(calls[0].sql).toContain('b.kind = ?2');
    expect(calls[0].binds[1]).toBe('page');
    expect(calls[1].binds[1]).toBe('chat');
  });

  test('listAllFiles filters on kind and defaults to page', async () => {
    const { env, calls } = fakeEnv();
    await listAllFiles(env);
    await listAllFiles(env, 'chat');
    expect(calls[0].sql).toContain('b.kind = ?2');
    expect(calls[0].binds[1]).toBe('page');
    expect(calls[1].binds[1]).toBe('chat');
  });
});
