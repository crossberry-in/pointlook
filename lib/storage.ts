import * as FileSystem from 'expo-file-system';

import { filenameFromUrl, type DownloadRecord, type Settings } from '@/lib/browser';

export type { DownloadRecord, Settings } from '@/lib/browser';

const DIR = `${FileSystem.documentDirectory}data`;
const SETTINGS_FILE = `${DIR}/settings.json`;
const DOWNLOADS_FILE = `${DIR}/downloads.json`;
const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(file);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await ensureDir(DIR);
  await FileSystem.writeAsStringAsync(file, JSON.stringify(value));
}

// ---------------------------------------------------------------- settings

export async function loadSettings(fallback: Settings): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(SETTINGS_FILE, {});
  return { ...fallback, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(SETTINGS_FILE, settings);
}

// --------------------------------------------------------------- downloads

export async function loadDownloads(): Promise<DownloadRecord[]> {
  const list = await readJson<DownloadRecord[]>(DOWNLOADS_FILE, []);
  return Array.isArray(list) ? list : [];
}

export async function saveDownloads(list: DownloadRecord[]): Promise<void> {
  await writeJson(DOWNLOADS_FILE, list);
}

export async function downloadToStorage(
  url: string,
  mime: string,
): Promise<DownloadRecord> {
  await ensureDir(DOWNLOAD_DIR);
  const filename = `${Date.now().toString(36)}-${filenameFromUrl(url)}`;
  const fileUri = `${DOWNLOAD_DIR}${filename}`;
  const result = await FileSystem.downloadAsync(url, fileUri);
  const info = await FileSystem.getInfoAsync(result.uri);
  const bytes = 'size' in info && info.exists ? (info.size as number) : 0;
  return {
    id: `dl-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    url,
    fileUri: result.uri,
    filename: filenameFromUrl(url) || filename,
    mime: result.headers?.['content-type'] || mime,
    bytes,
    ts: Date.now(),
  };
}

export async function removeDownloadFile(record: DownloadRecord): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(record.fileUri);
    if (info.exists) await FileSystem.deleteAsync(record.fileUri, { idempotent: true });
  } catch {
    // ignore
  }
}
