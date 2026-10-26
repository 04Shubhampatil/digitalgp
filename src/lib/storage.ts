import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getEnv } from "@/lib/env";

/**
 * File storage abstraction. Media metadata lives in Postgres (`Media.storageKey`); bytes live
 * behind this adapter. The first implementation is the VPS disk under `UPLOADS_DIR`
 * (default `./uploads`, git-ignored). Object storage can replace it behind the same interface.
 *
 * Keys look like `<tenantId>/<mediaId>.<ext>` or `shared/<ownerUnitId>/<mediaId>.<ext>` and are
 * generated server-side — never from client input.
 */
export interface StoredFile {
  stream: ReadableStream;
  sizeBytes: number;
}

export interface StorageAdapter {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]*$/i;

/** Reject anything that could escape the root (absolute paths, `..`, backslashes, odd chars). */
export function assertSafeKey(key: string): void {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//") || key.endsWith("/")) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    const rootAbs = path.resolve(this.root);
    if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error(`Storage key escapes root: ${key}`);
    return full;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: "wx" });
  }

  async get(key: string): Promise<StoredFile | null> {
    const full = this.resolve(key);
    try {
      const info = await stat(full);
      if (!info.isFile()) return null;
      const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
      return { stream, sizeBytes: info.size };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

let adapter: StorageAdapter | undefined;

/** Process-wide storage adapter (local disk for now). */
export function getStorage(): StorageAdapter {
  adapter ??= new LocalDiskStorage(getEnv().UPLOADS_DIR);
  return adapter;
}

/** Test hook: swap the adapter (e.g. a temp directory). */
export function setStorage(next: StorageAdapter | undefined): void {
  adapter = next;
}
