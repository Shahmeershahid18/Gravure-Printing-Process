'use client'

const DB_NAME = 'gravure-sync'
const STORE_NAME = 'sync-queue'

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export interface SyncTask {
  id?: number
  action: string
  payload: any
  timestamp: number
}

export async function enqueueSyncTask(action: string, payload: any) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  
  const task: SyncTask = {
    action,
    payload,
    timestamp: Date.now()
  }
  
  store.add(task)
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = reject
  })
}

export async function getSyncQueue(): Promise<SyncTask[]> {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const request = store.getAll()
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = reject
  })
}

export async function removeSyncTask(id: number) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.delete(id)
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = reject
  })
}

export async function clearSyncQueue() {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.clear()
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = reject
  })
}
