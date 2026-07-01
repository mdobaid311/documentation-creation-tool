// Abstraction over where screenshot bytes live. Local disk today; swap in an
// S3/GCS implementation later without touching the repository or API layers.
export interface StorageProvider {
  /**
   * Persist binary data and return a stable key. The key is stored in the DB
   * and later resolved to a URL via `publicUrl`.
   */
  save(data: Buffer, contentType: string): Promise<string>;
  /** Delete previously saved data. Missing keys are ignored. */
  remove(key: string): Promise<void>;
  /**
   * Duplicate stored data, returning a fresh independent key (so deleting or
   * replacing one copy never affects the other). Null/missing keys → null.
   */
  copy(key: string | null | undefined): Promise<string | null>;
  /** Resolve a stored key to a URL the browser can load. */
  publicUrl(key: string | null | undefined): string | null;
}

/** Decode a data URL or raw base64 string into a Buffer + content type. */
export function decodeImageInput(input: string): {
  buffer: Buffer;
  contentType: string;
} {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(input.trim());
  if (match) {
    return {
      buffer: Buffer.from(match[2], "base64"),
      contentType: match[1],
    };
  }
  // Assume raw base64 PNG.
  return { buffer: Buffer.from(input, "base64"), contentType: "image/png" };
}
