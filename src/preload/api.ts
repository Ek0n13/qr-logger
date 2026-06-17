import { ipcRenderer } from 'electron'

export type UpdateStatus = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message: string
  version?: string
  percent?: number
}

export const api = {
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
