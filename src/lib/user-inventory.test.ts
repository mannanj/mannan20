import { beforeEach, describe, expect, test } from 'bun:test';
import { accessTestDb } from '@/lib/app-access-test-db';
import type { D1Binding } from '@/lib/cf-bindings';
import { decrementItem, getInventory, getScore, mergeInventory, mergeMax, mergeScore, parseBagEntries } from '@/lib/user-inventory';

const EMAIL = 'alice@example.com';
const max = (id: string) => (id === 'egg' ? 12 : 1);
let db: D1Binding;

beforeEach(() => {
  db = accessTestDb();
});

describe('mergeMax', () => {
  test('takes the larger count and keeps ids only one side has', () => {
    const merged = mergeMax([{ id: 'egg', count: 3 }, { id: 'odd', count: 1 }], [{ id: 'egg', count: 5 }, { id: 'key', count: 1 }], max);
    expect(Object.fromEntries(merged.map((m) => [m.id, m.count]))).toEqual({ egg: 5, odd: 1, key: 1 });
  });

  test('never lowers a local count', () => {
    expect(mergeMax([{ id: 'egg', count: 9 }], [{ id: 'egg', count: 2 }], max)).toEqual([{ id: 'egg', count: 9 }]);
  });

  test('respects the cap', () => {
    expect(mergeMax([{ id: 'egg', count: 99 }], [], max)).toEqual([{ id: 'egg', count: 12 }]);
  });
});

describe('server bag', () => {
  test('merge never lowers or drops, and caps', async () => {
    await mergeInventory(db, EMAIL, [{ id: 'egg', count: 5 }, { id: 'mystery', count: 2 }], max);
    const bag = await mergeInventory(db, EMAIL, [{ id: 'egg', count: 2 }, { id: 'key', count: 40 }], max);
    expect(Object.fromEntries(bag.map((m) => [m.id, m.count]))).toEqual({ egg: 5, mystery: 1, key: 1 });
  });

  test('decrement floors at 0 and deletes the row', async () => {
    await mergeInventory(db, EMAIL, [{ id: 'egg', count: 2 }], max);
    expect(await decrementItem(db, EMAIL, 'egg')).toEqual([{ id: 'egg', count: 1 }]);
    expect(await decrementItem(db, EMAIL, 'egg')).toEqual([]);
    expect(await decrementItem(db, EMAIL, 'egg')).toEqual([]);
    const rows = await db.prepare('SELECT count FROM user_inventory WHERE email = ?').bind(EMAIL).all();
    expect(rows.results).toEqual([]);
  });

  test('bags are per account', async () => {
    await mergeInventory(db, EMAIL, [{ id: 'egg', count: 2 }], max);
    expect(await getInventory(db, 'bob@example.com')).toEqual([]);
  });
});

describe('score', () => {
  test('only goes up', async () => {
    expect(await mergeScore(db, EMAIL, 'chicken-v3', 50)).toBe(50);
    expect(await mergeScore(db, EMAIL, 'chicken-v3', 10)).toBe(50);
    expect(await mergeScore(db, EMAIL, 'chicken-v3', 70)).toBe(70);
    expect(await getScore(db, EMAIL, 'chicken-v3')).toBe(70);
  });
});

describe('parseBagEntries', () => {
  test('validates ids, counts and size', () => {
    expect(parseBagEntries([{ id: 'egg', count: 1 }])).toEqual([{ id: 'egg', count: 1 }]);
    expect(parseBagEntries([{ id: 'Bad Id', count: 1 }])).toBeNull();
    expect(parseBagEntries([{ id: 'egg', count: 0 }])).toBeNull();
    expect(parseBagEntries([{ id: 'egg', count: 1001 }])).toBeNull();
    expect(parseBagEntries([{ id: 'egg', count: 1.5 }])).toBeNull();
    expect(parseBagEntries(Array.from({ length: 65 }, (_, i) => ({ id: `i${i}`, count: 1 })))).toBeNull();
  });
});
