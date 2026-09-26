export interface D1Meta {
  changes: number;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: D1Meta }>;
}

export interface D1Binding {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

export interface R2Object {
  body: ReadableStream<Uint8Array> | null;
  size: number;
}

export interface R2PutOptions {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

export interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

export interface R2MultipartUpload {
  uploadId: string;
  uploadPart(
    partNumber: number,
    value: ReadableStream<Uint8Array> | ArrayBuffer | Blob | string,
  ): Promise<R2UploadedPart>;
  complete(parts: R2UploadedPart[]): Promise<{ size: number }>;
  abort(): Promise<void>;
}

export interface R2Binding {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | Blob | string,
    options?: R2PutOptions,
  ): Promise<unknown>;
  createMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
}
