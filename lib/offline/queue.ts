"use client"

/**
 * The offline write queue -- plan Section 10.3.
 *
 * Writes go to IndexedDB first, then flush to Supabase. The UI never blocks on
 * the network, because a grid designed for online-only cannot be retrofitted
 * cleanly once the shop floor wifi turns out to be what shop floor wifi always
 * is.
 *
 * Conflict rule: last write wins per field. Two operators editing the same
 * station is rare; two operators editing the same *field* of the same station
 * is rarer still, and the audit log keeps both versions either way.
 */

const DB_NAME = "gravuretrace"
const DB_VERSION = 2
const STORE = "write-queue"

export type QueuedWrite = {
  id?: number
  /** Supabase table the write lands on. */
  table: "run_stations" | "run_process" | "runs" | "run_substrates" | "observations"
  op: "update" | "insert"
  /** Equality filter for updates, e.g. { id: "…" }. */
  match?: Record<string, string>
  payload: Record<string, unknown>
  /** Groups writes so the banner can count edits rather than fields. */
  scope: string
  ts: number
  attempts: number
  lastError?: string
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
        store.createIndex("ts", "ts")
        store.createIndex("scope", "scope")
      }
      // Drop the v1 store, whose records have a different shape.
      if (db.objectStoreNames.contains("sync-queue")) {
        db.deleteObjectStore("sync-queue")
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

export async function enqueue(
  write: Omit<QueuedWrite, "id" | "ts" | "attempts">
): Promise<void> {
  await tx("readwrite", (s) =>
    s.add({ ...write, ts: Date.now(), attempts: 0 } as QueuedWrite)
  )
  notify()
}

export async function pending(): Promise<QueuedWrite[]> {
  const rows = await tx<QueuedWrite[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedWrite[]>)
  return rows.sort((a, b) => a.ts - b.ts)
}

export async function pendingCount(): Promise<number> {
  return (await pending()).length
}

export async function remove(id: number): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>)
  notify()
}

export async function markFailed(row: QueuedWrite, error: string): Promise<void> {
  await tx("readwrite", (s) =>
    s.put({ ...row, attempts: row.attempts + 1, lastError: error }) as unknown as IDBRequest<number>
  )
  notify()
}

export async function clear(): Promise<void> {
  await tx("readwrite", (s) => s.clear() as unknown as IDBRequest<undefined>)
  notify()
}

// -- change notification -----------------------------------------------------
// A plain event beats polling: the banner updates the instant a field is
// queued, and the sync loop wakes without a timer.

const EVENT = "gt-queue-changed"

export function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT))
}

export function onQueueChange(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}
