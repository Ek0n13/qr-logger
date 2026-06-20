import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type QrLogRecord = {
  id: number
  qrCode: string
  name: string
  product: string
  created: string
  updated: string
  deleted: string | null
}

export type QrLogDateInput = Date | string

export type QrLogFilters = {
  name?: string
  product?: string
  createdFrom?: QrLogDateInput
  createdTo?: QrLogDateInput
  updatedFrom?: QrLogDateInput
  updatedTo?: QrLogDateInput
  includeDeleted?: boolean
}

type QrLogDatabaseRow = {
  id: number
  qr_code: string
  name: string
  product: string
  created: string
  updated: string
  deleted: string | null
}

type QrLogSuggestionRow = {
  value: string
}

type QrLogSuggestionColumn = 'name' | 'product'

let database: Database.Database | null = null

function toSqliteTimestamp(value: QrLogDateInput): string {
  if (value instanceof Date) {
    return formatDateAsSqliteTimestamp(value)
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value
  }

  const parsedDate = new Date(value)

  if (!Number.isNaN(parsedDate.getTime())) {
    return formatDateAsSqliteTimestamp(parsedDate)
  }

  return value
}

function formatDateAsSqliteTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ')
}

function mapQrLogRow(row: QrLogDatabaseRow): QrLogRecord {
  return {
    id: row.id,
    qrCode: row.qr_code,
    name: row.name,
    product: row.product,
    created: row.created,
    updated: row.updated,
    deleted: row.deleted
  }
}

function getDatabasePath(): string {
  const dataDirectory = join(app.getPath('userData'), 'data')
  mkdirSync(dataDirectory, { recursive: true })

  return join(dataDirectory, 'qr-logger.sqlite')
}

function ensureSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS qr_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT NOT NULL,
      name TEXT NOT NULL,
      product TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL DEFAULT (datetime('now')),
      updated TEXT NOT NULL DEFAULT (datetime('now')),
      deleted TEXT
    );
  `)

  const columns = db.prepare('PRAGMA table_info(qr_logs)').all() as Array<{ name: string }>

  if (!columns.some((column) => column.name === 'product')) {
    db.exec(`ALTER TABLE qr_logs ADD COLUMN product TEXT NOT NULL DEFAULT ''`)
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_logs_qr_code ON qr_logs (qr_code);
    CREATE INDEX IF NOT EXISTS idx_qr_logs_name ON qr_logs (name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_qr_logs_product ON qr_logs (product COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_qr_logs_created ON qr_logs (created);
    CREATE INDEX IF NOT EXISTS idx_qr_logs_updated ON qr_logs (updated);
  `)
}

export function getQrLogDatabase(): Database.Database {
  if (database) {
    return database
  }

  database = new Database(getDatabasePath())
  ensureSchema(database)

  return database
}

export function insertQrLog(qrCode: string, name: string, product = ''): QrLogRecord {
  const db = getQrLogDatabase()
  const result = db
    .prepare(
      `
        INSERT INTO qr_logs (qr_code, name, product)
        VALUES (?, ?, ?)
      `
    )
    .run(qrCode, name, product)

  return getQrLogById(Number(result.lastInsertRowid))
}

export function updateQrLogByQrCode(
  qrCode: string,
  name: string,
  product?: string
): QrLogRecord | null {
  const db = getQrLogDatabase()
  const result =
    product === undefined
      ? db
          .prepare(
            `
        UPDATE qr_logs
        SET name = ?, updated = datetime('now')
        WHERE qr_code = ? AND deleted IS NULL
      `
          )
          .run(name, qrCode)
      : db
          .prepare(
            `
        UPDATE qr_logs
        SET name = ?, product = ?, updated = datetime('now')
        WHERE qr_code = ? AND deleted IS NULL
      `
          )
          .run(name, product, qrCode)

  if (result.changes === 0) {
    return null
  }

  return getQrLogByQrCode(qrCode)
}

export function markQrLogDeletedByQrCode(qrCode: string): QrLogRecord | null {
  const db = getQrLogDatabase()
  const result = db
    .prepare(
      `
        UPDATE qr_logs
        SET deleted = datetime('now'), updated = datetime('now')
        WHERE qr_code = ? AND deleted IS NULL
      `
    )
    .run(qrCode)

  if (result.changes === 0) {
    return null
  }

  return getQrLogByQrCode(qrCode, true)
}

export function getQrLogByQrCode(qrCode: string, includeDeleted = false): QrLogRecord | null {
  const db = getQrLogDatabase()
  const row = db
    .prepare(
      `
        SELECT id, qr_code, name, product, created, updated, deleted
        FROM qr_logs
        WHERE qr_code = ?${includeDeleted ? '' : ' AND deleted IS NULL'}
      `
    )
    .get(qrCode) as QrLogDatabaseRow | undefined

  return row ? mapQrLogRow(row) : null
}

export function findQrLogs(filters: QrLogFilters = {}): QrLogRecord[] {
  const conditions: string[] = []
  const params: Record<string, string> = {}

  if (!filters.includeDeleted) {
    conditions.push('deleted IS NULL')
  }

  if (filters.name) {
    conditions.push("name LIKE @name ESCAPE '\\' COLLATE NOCASE")
    params.name = `%${escapeLikePattern(filters.name)}%`
  }

  if (filters.product) {
    conditions.push("product LIKE @product ESCAPE '\\' COLLATE NOCASE")
    params.product = `%${escapeLikePattern(filters.product)}%`
  }

  if (filters.createdFrom) {
    conditions.push('created >= @createdFrom')
    params.createdFrom = toSqliteTimestamp(filters.createdFrom)
  }

  if (filters.createdTo) {
    conditions.push('created <= @createdTo')
    params.createdTo = toSqliteTimestamp(filters.createdTo)
  }

  if (filters.updatedFrom) {
    conditions.push('updated >= @updatedFrom')
    params.updatedFrom = toSqliteTimestamp(filters.updatedFrom)
  }

  if (filters.updatedTo) {
    conditions.push('updated <= @updatedTo')
    params.updatedTo = toSqliteTimestamp(filters.updatedTo)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = getQrLogDatabase()
    .prepare(
      `
        SELECT id, qr_code, name, product, created, updated, deleted
        FROM qr_logs
        ${whereClause}
        ORDER BY updated DESC, id DESC
      `
    )
    .all(params) as QrLogDatabaseRow[]

  return rows.map(mapQrLogRow)
}

export function findQrLogsByName(name: string): QrLogRecord[] {
  return findQrLogs({ name })
}

export function findQrLogsByProduct(product: string): QrLogRecord[] {
  return findQrLogs({ product })
}

export function findQrLogNameSuggestions(query: string, limit = 10): string[] {
  return findQrLogSuggestions('name', query, limit)
}

export function findQrLogProductSuggestions(query: string, limit = 10): string[] {
  return findQrLogSuggestions('product', query, limit)
}

export function findQrLogsByCreatedRange(
  createdFrom?: QrLogDateInput,
  createdTo?: QrLogDateInput
): QrLogRecord[] {
  return findQrLogs({ createdFrom, createdTo })
}

export function findQrLogsByUpdatedRange(
  updatedFrom?: QrLogDateInput,
  updatedTo?: QrLogDateInput
): QrLogRecord[] {
  return findQrLogs({ updatedFrom, updatedTo })
}

export function closeQrLogDatabase(): void {
  database?.close()
  database = null
}

function getQrLogById(id: number): QrLogRecord {
  const row = getQrLogDatabase()
    .prepare(
      `
        SELECT id, qr_code, name, product, created, updated, deleted
        FROM qr_logs
        WHERE id = ?
      `
    )
    .get(id) as QrLogDatabaseRow | undefined

  if (!row) {
    throw new Error(`QR log row ${id} was not found after insert.`)
  }

  return mapQrLogRow(row)
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function findQrLogSuggestions(
  column: QrLogSuggestionColumn,
  query: string,
  limit: number
): string[] {
  const nextQuery = query.trim()
  const nextLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 10)) : 10

  if (!nextQuery) {
    return []
  }

  const rows = getQrLogDatabase()
    .prepare(
      `
        SELECT ${column} AS value
        FROM qr_logs
        WHERE deleted IS NULL
          AND ${column} <> ''
          AND ${column} LIKE @query ESCAPE '\\' COLLATE NOCASE
        GROUP BY ${column} COLLATE NOCASE
        ORDER BY ${column} COLLATE NOCASE ASC
        LIMIT @limit
      `
    )
    .all({
      query: `%${escapeLikePattern(nextQuery)}%`,
      limit: nextLimit
    }) as QrLogSuggestionRow[]

  return rows.map((row) => row.value)
}
