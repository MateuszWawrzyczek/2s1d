/**
 * Object storage abstraction.
 *
 * The app stores item photos through a small object storage abstraction so a
 * Docker deployment can use local filesystem storage or an S3-compatible
 * backend (MinIO, AWS S3, R2 S3 API) without touching route handlers.
 *
 * Three implementations are provided:
 *  - `S3ObjectStorage`  – S3-compatible (works with MinIO + AWS S3 + R2's
 *                         S3 API); lazily imports @aws-sdk/client-s3
 *  - `LocalFsStorage`   – local filesystem; sufficient for single-node
 *                         self-hosted deployments and tests
 *
 * The factory `createObjectStorage(env)` picks one based on env vars:
 *   - if `S3_BUCKET` is set → S3ObjectStorage
 *   - else                  → LocalFsStorage
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export interface PutOptions {
  contentType?: string;
}

export interface ObjectInfo {
  size: number;
  contentType: string;
}

export interface ObjectStorage {
  /**
   * Persist `body` at `key`. `body` can be a Node Readable, a Web
   * ReadableStream, a Buffer, or a string.
   */
  put(key: string, body: PutBody, options?: PutOptions): Promise<void>;

  /**
   * Return a Web ReadableStream for the object, or null if it does not exist.
   */
  getStream(key: string): Promise<ReadableStream<Uint8Array> | null>;

  /**
   * Return the object bytes as a Uint8Array plus its content type. Used by
   * the HTTP layer to serve downloads. Returns null when the object is
   * missing.
   */
  getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null>;

  /**
   * Return metadata for the object (or null if missing).
   */
  head(key: string): Promise<ObjectInfo | null>;

  /**
   * Remove a single object (no-op if missing).
   */
  delete(key: string): Promise<void>;

  /**
   * Build the public URL for an object. The default is to use the
   * `PHOTOS_PUBLIC_URL` prefix, falling back to a `/storage/...` route
   * that the Node server can proxy through to the local filesystem.
   */
  publicUrl(key: string): string;
}

export type PutBody = ReadableStream<Uint8Array> | Buffer | string;

// ─── S3-compatible (MinIO, AWS S3, R2 S3 API) ──────────────────────────────

interface S3LikeClient {
  send: (cmd: unknown) => Promise<unknown>;
}

export class S3ObjectStorage implements ObjectStorage {
  private client: S3LikeClient | null = null;
  private commandClasses: Record<string, unknown> | null = null;
  private readonly endpoint: string | undefined;
  private readonly publicPrefix: string | undefined;

  constructor(
    private readonly config: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicUrl?: string;
      forcePathStyle?: boolean;
    }
  ) {
    this.endpoint = config.endpoint;
    this.publicPrefix = config.publicUrl;
  }

  private async ensureClient(): Promise<{
    client: S3LikeClient;
    cmd: Record<string, unknown>;
  }> {
    if (this.client && this.commandClasses) {
      return { client: this.client, cmd: this.commandClasses };
    }
    // Lazy import so local-only deployments do not load AWS SDK code.
    const mod = await import('@aws-sdk/client-s3');
    this.commandClasses = mod as unknown as Record<string, unknown>;
    const ClientClass = (
      mod as unknown as { S3Client: new (cfg: unknown) => S3LikeClient }
    ).S3Client;
    this.client = new ClientClass({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle:
        this.config.forcePathStyle ?? Boolean(this.config.endpoint),
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    return { client: this.client, cmd: this.commandClasses };
  }

  async put(key: string, body: PutBody, options?: PutOptions): Promise<void> {
    const { client, cmd } = await this.ensureClient();
    const PutObjectCtor = (
      cmd as { PutObjectCommand: new (i: unknown) => unknown }
    ).PutObjectCommand;
    const buf = await toBuffer(body);
    await client.send(
      new PutObjectCtor({
        Bucket: this.config.bucket,
        Key: key,
        Body: buf,
        ContentType: options?.contentType,
      })
    );
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const bytes = await this.getBytes(key);
    if (!bytes) return null;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.body);
        controller.close();
      },
    });
  }

  async getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null> {
    const { client, cmd } = await this.ensureClient();
    const GetObjectCtor = (
      cmd as { GetObjectCommand: new (i: unknown) => unknown }
    ).GetObjectCommand;
    try {
      const out = (await client.send(
        new GetObjectCtor({ Bucket: this.config.bucket, Key: key })
      )) as {
        Body?: { transformToByteArray: () => Promise<Uint8Array> };
        ContentType?: string;
      };
      const body = await out.Body!.transformToByteArray();
      return {
        body,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const { client, cmd } = await this.ensureClient();
    const HeadObjectCtor = (
      cmd as { HeadObjectCommand: new (i: unknown) => unknown }
    ).HeadObjectCommand;
    try {
      const out = (await client.send(
        new HeadObjectCtor({ Bucket: this.config.bucket, Key: key })
      )) as { ContentLength?: number; ContentType?: string };
      return {
        size: out.ContentLength ?? 0,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const { client, cmd } = await this.ensureClient();
    const DeleteObjectCtor = (
      cmd as { DeleteObjectCommand: new (i: unknown) => unknown }
    ).DeleteObjectCommand;
    await client.send(
      new DeleteObjectCtor({ Bucket: this.config.bucket, Key: key })
    );
  }

  publicUrl(key: string): string {
    if (this.publicPrefix)
      return `${this.publicPrefix.replace(/\/$/, '')}/${key}`;
    if (this.endpoint) {
      // path-style URL: http://host:port/bucket/key
      return `${this.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e.name === 'NoSuchKey' ||
    e.name === 'NotFound' ||
    e.$metadata?.httpStatusCode === 404
  );
}

async function toBuffer(body: PutBody): Promise<Buffer> {
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Buffer) return body;
  // ReadableStream → Buffer
  const stream = body as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// ─── Local filesystem ──────────────────────────────────────────────────────

export class LocalFsStorage implements ObjectStorage {
  constructor(
    private readonly rootDir: string,
    private readonly publicPrefix?: string
  ) {}

  private resolve(key: string): string {
    // Normalise, forbid path traversal.
    const normalised = normalize(key).replace(/^(\.\.[/\\])+/, '');
    if (normalised.startsWith('..') || normalised.includes(`..${sep}`)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return join(this.rootDir, normalised);
  }

  async put(key: string, body: PutBody, options?: PutOptions): Promise<void> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    if (typeof body === 'string') {
      await pipeline(Readable.from(Buffer.from(body)), createWriteStream(path));
    } else if (body instanceof Buffer) {
      await pipeline(Readable.from(body), createWriteStream(path));
    } else {
      // Web ReadableStream → Node Readable
      const node = Readable.fromWeb(
        body as unknown as import('stream/web').ReadableStream
      );
      await pipeline(node, createWriteStream(path));
    }
    if (options?.contentType) {
      // Persist content type next to the file as <key>.contenttype
      await pipeline(
        Readable.from(Buffer.from(options.contentType)),
        createWriteStream(path + '.contenttype')
      );
    }
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const path = this.resolve(key);
    try {
      await stat(path);
    } catch {
      return null;
    }
    const node = createReadStream(path);
    return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>;
  }

  async getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null> {
    const path = this.resolve(key);
    try {
      const [buf, ct] = await Promise.all([
        readFile(path),
        readContentType(path),
      ]);
      return { body: new Uint8Array(buf), contentType: ct };
    } catch {
      return null;
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const path = this.resolve(key);
    try {
      const [s, ct] = await Promise.all([stat(path), readContentType(path)]);
      return { size: s.size, contentType: ct };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.resolve(key);
    try {
      await unlink(path);
    } catch {
      /* ignore */
    }
    try {
      await unlink(path + '.contenttype');
    } catch {
      /* ignore */
    }
  }

  publicUrl(key: string): string {
    if (this.publicPrefix)
      return `${this.publicPrefix.replace(/\/$/, '')}/${key}`;
    return `/storage/${key}`;
  }
}

async function readFile(path: string): Promise<ArrayBuffer> {
  const { readFile: rf } = await import('node:fs/promises');
  const buf = await rf(path);
  // Return an ArrayBuffer (not a Node Buffer) so the consumer can use it
  // in Web APIs without an extra copy.
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

async function readContentType(path: string): Promise<string> {
  try {
    const { readFile: rf } = await import('node:fs/promises');
    const buf = await rf(path + '.contenttype');
    return buf.toString('utf8') || 'application/octet-stream';
  } catch {
    return 'application/octet-stream';
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

type StorageEnv = Env & {
  PHOTOS_PUBLIC_URL?: string;
  PHOTOS_LOCAL_DIR?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_PUBLIC_URL?: string;
};

/**
 * Pick the right storage backend for the runtime:
 *  - S3_BUCKET + S3_* credentials   → S3ObjectStorage
 *  - otherwise                      → LocalFsStorage
 */
export function createObjectStorage(env: Env): ObjectStorage {
  const storageEnv = env as StorageEnv;
  if (
    storageEnv.S3_BUCKET &&
    storageEnv.S3_ACCESS_KEY_ID &&
    storageEnv.S3_SECRET_ACCESS_KEY
  ) {
    return new S3ObjectStorage({
      endpoint: storageEnv.S3_ENDPOINT,
      region: storageEnv.S3_REGION ?? 'us-east-1',
      bucket: storageEnv.S3_BUCKET,
      accessKeyId: storageEnv.S3_ACCESS_KEY_ID,
      secretAccessKey: storageEnv.S3_SECRET_ACCESS_KEY,
      publicUrl: storageEnv.S3_PUBLIC_URL,
    });
  }
  const root = storageEnv.PHOTOS_LOCAL_DIR ?? './storage';
  return new LocalFsStorage(root, storageEnv.PHOTOS_PUBLIC_URL);
}
