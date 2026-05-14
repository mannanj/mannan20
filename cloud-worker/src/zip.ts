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
}

export function streamZip(sources: AsyncIterable<ZipSource>, filename: string): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    type Entry = { name: Uint8Array; crc: number; size: number; offset: number };
    const entries: Entry[] = [];
    let offset = 0;

    for await (const src of sources) {
      if (!src.body) continue;
      const nameBytes = enc.encode(src.name);
      const header = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0008, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0x21, true);
      dv.setUint32(14, 0, true);
      dv.setUint32(18, 0, true);
      dv.setUint32(22, 0, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      header.set(nameBytes, 30);

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

      entries.push({ name: nameBytes, crc, size, offset: entryOffset });
    }

    const cdStart = offset;
    for (const e of entries) {
      const cd = new Uint8Array(46 + e.name.length);
      const dv = new DataView(cd.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0x0008, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint16(14, 0x21, true);
      dv.setUint32(16, e.crc, true);
      dv.setUint32(20, e.size, true);
      dv.setUint32(24, e.size, true);
      dv.setUint16(28, e.name.length, true);
      dv.setUint16(30, 0, true);
      dv.setUint16(32, 0, true);
      dv.setUint16(34, 0, true);
      dv.setUint16(36, 0, true);
      dv.setUint32(38, 0, true);
      dv.setUint32(42, e.offset, true);
      cd.set(e.name, 46);
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
      'cache-control': 'no-store',
    },
  });
}
