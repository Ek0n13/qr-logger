import { tryCatch } from '@maxmorozoff/try-catch-tuple'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { EditQrLogDialog } from '@renderer/components/EditQrLogDialog'
import { AppInput, LogButton } from '@renderer/components/AppFormControls'
import { ClipboardCopy, Trash2 } from 'lucide-react'

type QrLogRecord = Awaited<ReturnType<(typeof window.api.qrLogs)['list']>>[number]

type QrLogGroup = {
  date: string
  logs: QrLogRecord[]
}

function getDatePart(value: string): string {
  return value.slice(0, 10)
}

function formatDate(value: string): string {
  return getDatePart(value) || 'Unknown date'
}

function getFilteredLogs(logs: QrLogRecord[], searchQuery: string): QrLogRecord[] {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return logs
  }

  return logs.filter((log) =>
    [log.name, log.product, formatDate(log.created)].some((value) =>
      value.toLowerCase().includes(query)
    )
  )
}

function getGroupedLogs(logs: QrLogRecord[]): QrLogGroup[] {
  const groups = new Map<string, QrLogRecord[]>()

  for (const log of logs) {
    const date = formatDate(log.updated)
    const dateLogs = groups.get(date) ?? []
    dateLogs.push(log)
    groups.set(date, dateLogs)
  }

  return Array.from(groups, ([date, dateLogs]) => ({ date, logs: dateLogs }))
}

function sortLogsByUpdatedDate(logs: QrLogRecord[]): QrLogRecord[] {
  return [...logs].sort((firstLog, secondLog) => {
    const updatedComparison = secondLog.updated.localeCompare(firstLog.updated)

    if (updatedComparison !== 0) {
      return updatedComparison
    }

    return secondLog.created.localeCompare(firstLog.created)
  })
}

function LogsPage(): React.JSX.Element {
  const [logs, setLogs] = useState<QrLogRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadLogs(): Promise<void> {
      setIsLoading(true)
      const [nextLogs, error] = await tryCatch.async(() => window.api.qrLogs.list(), 'List QR logs')

      if (!isMounted) {
        return
      }

      setIsLoading(false)

      if (error) {
        toast.error(error.message)
        return
      }

      setLogs(nextLogs)
    }

    void loadLogs()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredLogs = getFilteredLogs(logs, searchQuery)
  const groupedLogs = getGroupedLogs(sortLogsByUpdatedDate(filteredLogs))

  async function handleCopyQrCode(log: QrLogRecord): Promise<void> {
    const [, error] = await tryCatch.async(
      () => navigator.clipboard.writeText(log.qrCode),
      'Copy QR code'
    )

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('QR code copied to clipboard')
  }

  async function handleDeleteQrLog(log: QrLogRecord): Promise<void> {
    const [deletedLog, error] = await tryCatch.async(
      () => window.api.qrLogs.markDeleted(log.qrCode),
      'Delete QR log'
    )

    if (error) {
      toast.error(error.message)
      return
    }

    if (!deletedLog) {
      toast.error('QR log was not found or was already deleted')
      return
    }

    setLogs((currentLogs) => currentLogs.filter((currentLog) => currentLog.qrCode !== log.qrCode))
    toast.success('QR log deleted')
  }

  function handleUpdateQrLog(updatedLog: QrLogRecord): void {
    setLogs((currentLogs) =>
      currentLogs.map((currentLog) =>
        currentLog.qrCode === updatedLog.qrCode ? updatedLog : currentLog
      )
    )
  }

  return (
    <main className="flex h-screen min-h-0 overflow-hidden px-6 py-6">
      <section className="flex min-h-0 w-full flex-col gap-6">
        <header className="shrink-0 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Logs page</h1>
          <p className="text-muted-foreground text-sm">
            Review scanned QR codes grouped by their latest update date.
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 bg-zinc-300">
            <AppInput
              type="search"
              value={searchQuery}
              placeholder="Search by name, product, or creation date"
              aria-label="Search logs"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 border-2 rounded-md bg-white **:data-[slot=table-container]:h-full **:data-[slot=table-container]:overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="w-px min-w-40">Name</TableHead>
                  <TableHead className="w-px min-w-40">Product</TableHead>
                  <TableHead className="w-px min-w-32">Creation date</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : groupedLogs.length > 0 ? (
                  groupedLogs.map((group) => [
                    <TableRow key={group.date} className="hover:bg-transparent">
                      <TableCell
                        colSpan={4}
                        className="bg-muted/50 text-muted-foreground py-2 text-xs font-medium tracking-wide uppercase"
                      >
                        Updated {group.date}
                      </TableCell>
                    </TableRow>,
                    ...group.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="w-px min-w-40">{log.name}</TableCell>
                        <TableCell className="w-px min-w-40">{log.product}</TableCell>
                        <TableCell className="w-px min-w-32">{formatDate(log.created)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <LogButton
                              type="button"
                              variant="default"
                              size="sm"
                              aria-label={`Copy ${log.name}`}
                              onClick={() => void handleCopyQrCode(log)}
                            >
                              <ClipboardCopy className="size-6" />
                            </LogButton>
                            <EditQrLogDialog log={log} onUpdated={handleUpdateQrLog} />
                            <LogButton
                              type="button"
                              variant="default"
                              className="text-red-700"
                              size="sm"
                              aria-label={`Delete ${log.name}`}
                              onClick={() => void handleDeleteQrLog(log)}
                            >
                              <Trash2 className="size-6" />
                            </LogButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ])
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                      No logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </main>
  )
}

export { LogsPage }
