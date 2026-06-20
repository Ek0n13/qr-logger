import { ipcMain } from 'electron'
import {
  findQrLogs,
  getQrLogByQrCode,
  insertQrLog,
  markQrLogDeletedByQrCode,
  updateQrLogByQrCode,
  type QrLogDateInput,
  type QrLogFilters,
  type QrLogRecord
} from './database'

type QrLogCreateInput = {
  qrCode: string
  name: string
}

type QrLogUpdateInput = {
  qrCode: string
  name: string
}

type QrLogDeleteInput = {
  qrCode: string
}

type QrLogGetInput = {
  qrCode: string
  includeDeleted?: boolean
}

export function registerQrLogIpcHandlers(): void {
  ipcMain.handle('qr-logs:create', (_event, input: QrLogCreateInput): QrLogRecord => {
    return insertQrLog(requireNonEmptyString(input?.qrCode, 'qrCode'), requireName(input?.name))
  })

  ipcMain.handle('qr-logs:update', (_event, input: QrLogUpdateInput): QrLogRecord | null => {
    return updateQrLogByQrCode(
      requireNonEmptyString(input?.qrCode, 'qrCode'),
      requireName(input?.name)
    )
  })

  ipcMain.handle('qr-logs:delete', (_event, input: QrLogDeleteInput): QrLogRecord | null => {
    return markQrLogDeletedByQrCode(requireNonEmptyString(input?.qrCode, 'qrCode'))
  })

  ipcMain.handle('qr-logs:list', (_event, filters?: QrLogFilters): QrLogRecord[] => {
    return findQrLogs(normalizeFilters(filters))
  })

  ipcMain.handle('qr-logs:get', (_event, input: QrLogGetInput): QrLogRecord | null => {
    return getQrLogByQrCode(
      requireNonEmptyString(input?.qrCode, 'qrCode'),
      input?.includeDeleted === true
    )
  })
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`)
  }

  return value
}

function requireName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('name must be a non-empty string.')
  }

  return value.trim()
}

function normalizeFilters(filters: unknown): QrLogFilters {
  if (!filters || typeof filters !== 'object') {
    return {}
  }

  const input = filters as Record<string, unknown>

  return {
    name: typeof input.name === 'string' ? input.name : undefined,
    createdFrom: normalizeDateInput(input.createdFrom),
    createdTo: normalizeDateInput(input.createdTo),
    updatedFrom: normalizeDateInput(input.updatedFrom),
    updatedTo: normalizeDateInput(input.updatedTo),
    includeDeleted: input.includeDeleted === true
  }
}

function normalizeDateInput(value: unknown): QrLogDateInput | undefined {
  if (value instanceof Date || typeof value === 'string') {
    return value
  }

  return undefined
}
