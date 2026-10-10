export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  size: number | null;
}

export interface ObjectStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** 不存在返回 null */
  getBytes(key: string): Promise<Uint8Array | null>;
  /** 不存在返回 null */
  getStream(key: string): Promise<StoredObject | null>;
  deleteMany(keys: string[]): Promise<void>;
  presignGet(key: string, expiresInSeconds: number, downloadName: string): Promise<string>;
}
