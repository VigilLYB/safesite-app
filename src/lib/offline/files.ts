import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

/**
 * Durable, app-private storage for offline data: the outbox, saved reports and the read cache.
 *
 * On a phone this is the app's document directory. No storage permission is needed: the OS gives
 * every app its own folder, which it does not clear (unlike the cache directory). Web has no such
 * folder, so there it falls back to memory and lasts only until the page reloads.
 *
 * Paths are lists of segments, e.g. ["outbox", userId + ".json"]. Segments are made safe here.
 */
export interface OfflineFiles {
  readText(path: string[]): Promise<string | null>;
  writeText(path: string[], text: string): Promise<void>;
  /** Deletes a file or a whole folder. Missing is fine. */
  remove(path: string[]): Promise<void>;
  /** Names of the entries directly inside a folder (empty when it does not exist). */
  list(path: string[]): Promise<string[]>;
  /**
   * Copies a captured file (e.g. a photo in the cache directory, which the OS may clear) into
   * durable storage. Returns the new URI.
   */
  copyIn(sourceUri: string, path: string[]): Promise<string>;
  /** Downloads a URL into durable storage (replacing what is there). Returns the local URI. */
  download(url: string, path: string[]): Promise<string>;
  /** The local URI of a stored file, or null when it is not on the device. */
  uriOf(path: string[]): Promise<string | null>;
}

const safe = (segment: string) => segment.replace(/[^A-Za-z0-9._-]/g, "_");

function deviceFiles(): OfflineFiles {
  const dirOf = (path: string[]) => new Directory(Paths.document, ...path.map(safe));
  const fileOf = (path: string[]) => new File(Paths.document, ...path.map(safe));
  const ensureParent = (path: string[]) => {
    const parent = dirOf(path.slice(0, -1));
    if (!parent.exists) parent.create({ intermediates: true });
  };
  return {
    async readText(path) {
      const file = fileOf(path);
      return file.exists ? file.text() : null;
    },
    async writeText(path, text) {
      ensureParent(path);
      // Write then rename, so a crash mid-write never leaves a half-written file behind.
      const tmp = fileOf([...path.slice(0, -1), `${path.at(-1)}.tmp`]);
      if (tmp.exists) tmp.delete();
      tmp.create();
      await tmp.write(text);
      const target = fileOf(path);
      if (target.exists) target.delete();
      await tmp.move(target);
    },
    async remove(path) {
      const file = fileOf(path);
      if (file.exists) {
        file.delete();
        return;
      }
      const dir = dirOf(path);
      if (dir.exists) dir.delete();
    },
    async list(path) {
      const dir = dirOf(path);
      if (!dir.exists) return [];
      return dir.list().map((entry) => entry.name);
    },
    async copyIn(sourceUri, path) {
      ensureParent(path);
      const source = new File(sourceUri);
      const dest = fileOf(path);
      await source.copy(dest, { overwrite: true });
      return dest.uri;
    },
    async download(url, path) {
      ensureParent(path);
      // Into a side file first: a dropped connection never leaves half an image under the real name.
      const part = fileOf([...path.slice(0, -1), `${path.at(-1)}.part`]);
      if (part.exists) part.delete();
      await File.downloadFileAsync(url, part, { idempotent: true });
      const target = fileOf(path);
      if (target.exists) target.delete();
      await part.move(target);
      return target.uri;
    },
    async uriOf(path) {
      const file = fileOf(path);
      return file.exists ? file.uri : null;
    },
  };
}

/** In memory: web, and Jest (see jest.setup.ts). */
export function memoryFiles(): OfflineFiles & { reset(): void } {
  const store = new Map<string, string>();
  const key = (path: string[]) => path.map(safe).join("/");
  return {
    async readText(path) {
      return store.get(key(path)) ?? null;
    },
    async writeText(path, text) {
      store.set(key(path), text);
    },
    async remove(path) {
      const k = key(path);
      for (const existing of [...store.keys()]) {
        if (existing === k || existing.startsWith(`${k}/`)) store.delete(existing);
      }
    },
    async list(path) {
      const prefix = `${key(path)}/`;
      const names = new Set<string>();
      for (const existing of store.keys()) {
        if (existing.startsWith(prefix)) names.add(existing.slice(prefix.length).split("/")[0]!);
      }
      return [...names];
    },
    async copyIn(sourceUri) {
      return sourceUri; // nothing durable to copy into; the original URI is all there is
    },
    async download(url, path) {
      // Nothing to download into: remember the URL so callers see the file as present.
      store.set(key(path), url);
      return `memory://${key(path)}`;
    },
    async uriOf(path) {
      return store.has(key(path)) ? `memory://${key(path)}` : null;
    },
    reset() {
      store.clear();
    },
  };
}

/** Native storage is only touched on first use, so importing this module is always safe. */
let chosen: OfflineFiles | null = null;
const pick = (): OfflineFiles => (chosen ??= Platform.OS === "web" ? memoryFiles() : deviceFiles());

export const offlineFiles: OfflineFiles = {
  readText: (path) => pick().readText(path),
  writeText: (path, text) => pick().writeText(path, text),
  remove: (path) => pick().remove(path),
  list: (path) => pick().list(path),
  copyIn: (uri, path) => pick().copyIn(uri, path),
  download: (url, path) => pick().download(url, path),
  uriOf: (path) => pick().uriOf(path),
};

/** Test seam: run on another backend (Jest uses memory; see jest.setup.ts). */
export function setOfflineFiles(next: OfflineFiles): void {
  chosen = next;
}
