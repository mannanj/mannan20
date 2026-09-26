type FixedLengthStreamCtor = new (length: number) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

function constructor(): FixedLengthStreamCtor | null {
  return (globalThis as { FixedLengthStream?: FixedLengthStreamCtor }).FixedLengthStream ?? null;
}

export function withKnownLength(
  body: ReadableStream<Uint8Array>,
  length: number,
): ReadableStream<Uint8Array> | null {
  const ctor = constructor();
  if (!ctor) return null;
  const { readable, writable } = new ctor(length);
  void body.pipeTo(writable);
  return readable;
}

export function blobWithKnownLength(blob: Blob): ReadableStream<Uint8Array> | Blob {
  return withKnownLength(blob.stream(), blob.size) ?? blob;
}
