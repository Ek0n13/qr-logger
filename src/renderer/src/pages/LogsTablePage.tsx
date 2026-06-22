import { tryCatch } from '@maxmorozoff/try-catch-tuple'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { LogsTable } from '@renderer/components/LogsTable'

type QrLogRecord = Awaited<ReturnType<(typeof window.api.qrLogs)['list']>>[number]

function LogsTablePage(): React.JSX.Element {
  const [logs, setLogs] = useState<QrLogRecord[]>([])
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

  async function handleDeleteQrLog(log: QrLogRecord): Promise<boolean> {
    const [deletedLog, error] = await tryCatch.async(
      () => window.api.qrLogs.markDeleted(log.qrCode),
      'Delete QR log'
    )

    if (error) {
      toast.error(error.message)
      return false
    }

    if (!deletedLog) {
      toast.error('QR log was not found or was already deleted')
      return false
    }

    setLogs((currentLogs) => currentLogs.filter((currentLog) => currentLog.qrCode !== log.qrCode))
    toast.success('QR log deleted')
    return true
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
        <header className="flex shrink-0 flex-col gap-2">
          <h1 className="text-3xl font-semibold">Logs table page</h1>
          <p className="text-muted-foreground text-sm">
            Review scanned QR codes in a sortable and filterable table.
          </p>
        </header>

        <LogsTable
          logs={logs}
          isLoading={isLoading}
          onCopyQrCode={handleCopyQrCode}
          onDeleted={handleDeleteQrLog}
          onUpdated={handleUpdateQrLog}
        />
      </section>
    </main>
  )
}

export { LogsTablePage }
