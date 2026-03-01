"use client";

const DB_NAME = "report-on-recordings";
const DB_VERSION = 1;
const STORE_NAME = "recordings";
const MAX_RECORDINGS = 3;

export interface LocalRecording {
  reportId: string;
  blob: Blob;
  mimeType: string;
  durationSec: number;
  createdAt: number;
  title?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("[IndexedDB] Open failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "reportId" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export async function saveRecording(
  reportId: string,
  blob: Blob,
  meta: { durationSec: number; title?: string }
): Promise<void> {
  const db = await openDB();

  const existing = await listRecordings();
  if (existing.length >= MAX_RECORDINGS) {
    const oldest = existing.sort((a, b) => a.createdAt - b.createdAt)[0];
    if (oldest) {
      await deleteRecording(oldest.reportId);
      console.log(`[IndexedDB] Deleted oldest recording: ${oldest.reportId}`);
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: LocalRecording = {
      reportId,
      blob,
      mimeType: blob.type || "audio/webm",
      durationSec: meta.durationSec,
      createdAt: Date.now(),
      title: meta.title,
    };

    const request = store.put(record);

    request.onerror = () => {
      console.error("[IndexedDB] Save failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`[IndexedDB] Saved recording: ${reportId}, size=${(blob.size / (1024 * 1024)).toFixed(2)}MB`);
      resolve();
    };

    tx.oncomplete = () => db.close();
  });
}

export async function loadRecording(reportId: string): Promise<LocalRecording | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(reportId);

    request.onerror = () => {
      console.error("[IndexedDB] Load failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result ?? null);
    };

    tx.oncomplete = () => db.close();
  });
}

export async function listRecordings(): Promise<LocalRecording[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      console.error("[IndexedDB] List failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result ?? []);
    };

    tx.oncomplete = () => db.close();
  });
}

export async function deleteRecording(reportId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(reportId);

    request.onerror = () => {
      console.error("[IndexedDB] Delete failed:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`[IndexedDB] Deleted recording: ${reportId}`);
      resolve();
    };

    tx.oncomplete = () => db.close();
  });
}

export async function countRecordings(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    tx.oncomplete = () => db.close();
  });
}
