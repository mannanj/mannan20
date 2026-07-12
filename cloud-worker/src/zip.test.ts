import { expect, test } from 'bun:test';
import { streamZip, type ZipSource } from './zip';

function body(value: string): ReadableStream<Uint8Array> {
  return new Blob([value]).stream();
}

test('validates archive entry names again while serializing', async () => {
  async function* sources(): AsyncIterable<ZipSource> {
    yield { name: '../escape.txt', body: body('hostile') };
    yield { name: 'safe/report.txt', body: body('safe') };
  }

  const response = streamZip(sources(), 'reports.zip');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');

  const bytes = new Uint8Array(await response.arrayBuffer());
  const serialized = new TextDecoder().decode(bytes);

  expect(serialized).toContain('safe/report.txt');
  expect(serialized).not.toContain('../escape.txt');
  expect(serialized).not.toContain('hostile');
});
