/** Repository depends only on this asynchronous contract; adapters own platform APIs. */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// WxStorageAdapter: implement with Taro.getStorage / setStorage / removeStorage.
// CloudStorageAdapter: implement after login; add per-user namespaces and version conflict handling.
// Both can be injected into TrainingRepository without changing domain calculations.
