import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

// Single configured storage provider for the app. Swap this factory to switch
// backends (e.g. an S3StorageProvider) without changing callers.
let provider: LocalStorageProvider | undefined;

export function getStorage(): StorageProvider {
  if (!provider) provider = new LocalStorageProvider();
  return provider;
}

// Local provider needs filesystem path resolution for the file route handler.
export function getLocalStorage(): LocalStorageProvider {
  return getStorage() as LocalStorageProvider;
}

export type { StorageProvider } from "./storage-provider";
export { decodeImageInput } from "./storage-provider";
