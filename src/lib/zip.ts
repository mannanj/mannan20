import { safeAttachmentFilename } from './attachment';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32Update(crc: number, chunk: Uint8Array): number {
  let c = crc;
  for (let i = 0; i < chunk.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ chunk[i]) & 0xff];
  return c >>> 0;
}

export interface ZipSource {
  name: string;
  body: ReadableStream<Uint8Array> | null;
  modified?: number;
}

function dosTimestamp(ms: number | undefined): { time: number; date: number } {
  const at = ms ? new Date(ms) : null;
  const year = at?.getUTCFullYear() ?? 0;
  if (!at || Number.isNaN(year) || year < 1980 || year > 2107) {
    return { time: 0, date: 0x21 };
  }
  return {
    time:
      (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | Math.floor(at.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate(),
  };
}

function extendedTimestamp(ms: number | undefined): Uint8Array {
  const seconds = ms ? Math.floor(ms / 1000) : 0;
  if (!seconds || !Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 0x7fffffff) {
    return new Uint8Array(0);
  }
  const field = new Uint8Array(9);
  const dv = new DataView(field.buffer);
  dv.setUint16(0, 0x5455, true);
  dv.setUint16(2, 5, true);
  field[4] = 0x01;
  dv.setInt32(5, seconds, true);
  return field;
}

export function streamZip(sources: AsyncIterable<ZipSource>, filename: string): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    type Entry = {
      name: Uint8Array;
      crc: number;
      size: number;
      offset: number;
      time: number;
      date: number;
      extra: Uint8Array;
    };
    const entries: Entry[] = [];
    let offset = 0;

    for await (const src of sources) {
      if (!src.body) continue;
      const entryName = safeAttachmentFilename(src.name);
      const nameBytes = enc.encode(entryName);
      const stamp = dosTimestamp(src.modified);
      const extra = extendedTimestamp(src.modified);
      const header = new Uint8Array(30 + nameBytes.length + extra.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0008, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, stamp.time, true);
      dv.setUint16(12, stamp.date, true);
      dv.setUint32(14, 0, true);
      dv.setUint32(18, 0, true);
      dv.setUint32(22, 0, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, extra.length, true);
      header.set(nameBytes, 30);
      if (extra.length) header.set(extra, 30 + nameBytes.length);

      const entryOffset = offset;
      await writer.write(header);
      offset += header.length;

      let crc = 0xffffffff;
      let size = 0;
      const reader = src.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            crc = crc32Update(crc, value);
            size += value.length;
            await writer.write(value);
            offset += value.length;
          }
        }
      } finally {
        reader.releaseLock();
      }
      crc = (crc ^ 0xffffffff) >>> 0;

      const dd = new Uint8Array(16);
      const ddv = new DataView(dd.buffer);
      ddv.setUint32(0, 0x08074b50, true);
      ddv.setUint32(4, crc, true);
      ddv.setUint32(8, size, true);
      ddv.setUint32(12, size, true);
      await writer.write(dd);
      offset += 16;

      entries.push({
        name: nameBytes,
        crc,
        size,
        offset: entryOffset,
        time: stamp.time,
        date: stamp.date,
        extra,
      });
    }

    const cdStart = offset;
    for (const e of entries) {
      const cd = new Uint8Array(46 + e.name.length + e.extra.length);
      const dv = new DataView(cd.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0x0008, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, e.time, true);
      dv.setUint16(14, e.date, true);
      dv.setUint32(16, e.crc, true);
      dv.setUint32(20, e.size, true);
      dv.setUint32(24, e.size, true);
      dv.setUint16(28, e.name.length, true);
      dv.setUint16(30, e.extra.length, true);
      dv.setUint16(32, 0, true);
      dv.setUint16(34, 0, true);
      dv.setUint16(36, 0, true);
      dv.setUint32(38, 0, true);
      dv.setUint32(42, e.offset, true);
      cd.set(e.name, 46);
      if (e.extra.length) cd.set(e.extra, 46 + e.name.length);
      await writer.write(cd);
      offset += cd.length;
    }
    const cdSize = offset - cdStart;

    const eocd = new Uint8Array(22);
    const dv = new DataView(eocd.buffer);
    dv.setUint32(0, 0x06054b50, true);
    dv.setUint16(4, 0, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, entries.length, true);
    dv.setUint16(10, entries.length, true);
    dv.setUint32(12, cdSize, true);
    dv.setUint32(16, cdStart, true);
    dv.setUint16(20, 0, true);
    await writer.write(eocd);

    await writer.close();
  })().catch(async (err) => {
    console.error('zip_stream_error', err);
    try {
      await writer.abort(err);
    } catch {}
  });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'download.zip';
  return new Response(readable, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${safeName}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'referrer-policy': 'no-referrer',
    },
  });
}
