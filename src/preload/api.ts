import { ipcRenderer } from 'electron'

export type UpdateStatus = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message: string
  version?: string
  percent?: number
}

export type QrLogRecord = {
  id: number
  qrCode: string
  name: string
  product: string
  created: string
  updated: string
  deleted: string | null
}

export type QrLogFilters = {
  name?: string
  product?: string
  createdFrom?: string
  createdTo?: string
  updatedFrom?: string
  updatedTo?: string
  includeDeleted?: boolean
}

export type QrLogInput = {
  qrCode: string
  name: string
  product?: string
}

export const api = {
  qrLogs: {
    create: (input: QrLogInput): Promise<QrLogRecord> =>
      ipcRenderer.invoke('qr-logs:create', input),

    update: (input: QrLogInput): Promise<QrLogRecord | null> =>
      ipcRenderer.invoke('qr-logs:update', input),

    markDeleted: (qrCode: string): Promise<QrLogRecord | null> =>
      ipcRenderer.invoke('qr-logs:delete', { qrCode }),

    list: (filters?: QrLogFilters): Promise<QrLogRecord[]> =>
      ipcRenderer.invoke('qr-logs:list', filters),

    suggestNames: (query: string): Promise<string[]> =>
      ipcRenderer.invoke('qr-logs:suggest-names', { query, limit: 10 }),

    suggestProducts: (query: string): Promise<string[]> =>
      ipcRenderer.invoke('qr-logs:suggest-products', { query, limit: 10 }),

    get: (qrCode: string, includeDeleted = false): Promise<QrLogRecord | null> =>
      ipcRenderer.invoke('qr-logs:get', { qrCode, includeDeleted })
  },

  updates: {
    check: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:check'),

    download: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:download'),

    install: (): Promise<void> => ipcRenderer.invoke('updates:install'),

    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus): void => {
        callback(status)
      }

      ipcRenderer.on('updates:status', listener)

      return () => {
        ipcRenderer.removeListener('updates:status', listener)
      }
    }
  }
}
