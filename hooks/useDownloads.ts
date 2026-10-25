import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';

import { downloadToStorage, loadDownloads, removeDownloadFile, saveDownloads, type DownloadRecord } from '@/lib/storage';

/**
 * Download manager state: persists the download list, enqueues new downloads
 * from WebView attachment events, and notifies via toasts.
 */
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [busyCount, setBusyCount] = useState(0);
  const loaded = useRef(false);

  useEffect(() => {
    loadDownloads()
      .then((list) => {
        setDownloads(list);
        loaded.current = true;
      })
      .catch(() => loaded.current = true);
  }, []);

  const persist = useCallback((list: DownloadRecord[]) => {
    setDownloads(list);
    saveDownloads(list).catch(() => {});
  }, []);

  const toast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  /** Start downloading `url` into app storage and record it. */
  const startDownload = useCallback(
    (url: string, mime = '') => {
      if (!/^https?:/i.test(url)) {
        toast('Download blocked (unsupported URL)');
        return;
      }
      toast('Download started…');
      setBusyCount((c) => c + 1);
      downloadToStorage(url, mime)
        .then((record) => {
          setBusyCount((c) => c - 1);
          setDownloads((prev) => {
            const next = [record, ...prev].slice(0, 200);
            saveDownloads(next).catch(() => {});
            return next;
          });
          toast(`Downloaded: ${record.filename}`);
        })
        .catch(() => {
          setBusyCount((c) => c - 1);
          toast('Download failed');
        });
    },
    [],
  );

  const removeDownload = useCallback(
    (id: string) => {
      const record = downloads.find((d) => d.id === id);
      if (record) removeDownloadFile(record).catch(() => {});
      persist(downloads.filter((d) => d.id !== id));
    },
    [downloads, persist],
  );

  const clearDownloads = useCallback(() => {
    downloads.forEach((d) => removeDownloadFile(d).catch(() => {}));
    persist([]);
  }, [downloads, persist]);

  return { downloads, busyCount, startDownload, removeDownload, clearDownloads };
}

export type DownloadsApi = ReturnType<typeof useDownloads>;
