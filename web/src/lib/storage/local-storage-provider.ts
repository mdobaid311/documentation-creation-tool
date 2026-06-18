import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./storage-provider";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

// Stores files on local disk under STORAGE_DIR and serves them through the
// /api/files/[key] route handler (keeps them out of the static public/ dir so
// they survive `next build` cleanly and can be swapped for object storage).
export class LocalStorageProvider implements StorageProvider {
  private readonly dir: string;

  constructor(dir = process.env.STORAGE_DIR || "./storage/uploads") {
    this.dir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  }

  async save(data: Buffer, contentType: string): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const ext = EXT_BY_TYPE[contentType] ?? "bin";
    const key = `${randomUUID()}.${ext}`;
    await writeFile(path.join(this.dir, key), data);
    return key;
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(path.join(this.dir, key));
    } catch {
      // Already gone — nothing to do.
    }
  }

  publicUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    return `/api/files/${encodeURIComponent(key)}`;
  }

  /** Absolute path for the file route handler to read from. */
  resolvePath(key: string): string {
    return path.join(this.dir, path.basename(key));
  }
}
