import { tryCatchAsync } from '@maxmorozoff/try-catch-tuple'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider
} from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { ArrowUpFromLine, ScanSearch, List } from 'lucide-react'

type UpdateStatus = Awaited<ReturnType<Window['api']['updates']['check']>>

const UPDATE_TOAST_ID = 'update-status'

type AppPage = 'scan' | 'logs'

function showUpdateToast(status: UpdateStatus): void {
  switch (status.status) {
    case 'checking':
      return

    case 'downloading':
      toast.loading(status.message, { id: UPDATE_TOAST_ID })
      return

    case 'available':
      toast.info(status.message, { id: UPDATE_TOAST_ID })
      return

    case 'downloaded':
      toast.success(status.message, { id: UPDATE_TOAST_ID })
      return

    case 'not-available':
      toast.info(status.message, { id: UPDATE_TOAST_ID })
      return

    case 'error':
      toast.error(status.message, { id: UPDATE_TOAST_ID })
      return
  }
}

type AppSidebarProps = {
  currentPage: AppPage
  onPageChange: (page: AppPage) => void
  children: React.ReactNode
}

function AppSidebar({ currentPage, onPageChange, children }: AppSidebarProps): React.JSX.Element {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    status: 'checking',
    message: 'Checking for updates...'
  })

  const hasUpdate = updateStatus.status === 'available' || updateStatus.status === 'downloaded'
  const hasUpdateError = updateStatus.status === 'error'
  const isUpdateChecking = updateStatus.status === 'checking'
  const isUpdateBusy = updateStatus.status === 'checking' || updateStatus.status === 'downloading'
  const showUpdateBadge = isUpdateChecking || hasUpdate || hasUpdateError
  const updateBadgeText = hasUpdate ? '1' : !hasUpdateError ? '!' : '...'

  useEffect(() => {
    let isMounted = true

    const unsubscribe = window.api.updates.onStatus((status) => {
      if (isMounted) {
        setUpdateStatus(status)
        showUpdateToast(status)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  async function handleUpdateClick(): Promise<void> {
    const [, error] = await tryCatchAsync(async () => {
      if (updateStatus.status === 'available') {
        const downloadingStatus: UpdateStatus = {
          status: 'downloading',
          message: updateStatus.version
            ? `Downloading version ${updateStatus.version}...`
            : 'Downloading update...'
        }

        setUpdateStatus(downloadingStatus)
        showUpdateToast(downloadingStatus)

        await window.api.updates.download()
        await window.api.updates.install()
        return
      }

      if (updateStatus.status === 'downloaded') {
        await window.api.updates.install()
      }
    }, 'Install update')

    if (error) {
      const errorStatus: UpdateStatus = {
        status: 'error',
        message: error.message
      }

      setUpdateStatus(errorStatus)
      showUpdateToast(errorStatus)
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" className="border-r bg-zinc-800 text-zinc-300">
        <SidebarHeader className="items-center p-1">
          <Button
            variant={currentPage === 'scan' ? 'secondary' : 'ghost'}
            size="icon-lg"
            aria-label="Scan"
            aria-pressed={currentPage === 'scan'}
            onClick={() => onPageChange('scan')}
          >
            <ScanSearch className="size-6" />
          </Button>
          <Button
            variant={currentPage === 'logs' ? 'secondary' : 'ghost'}
            size="icon-lg"
            aria-label="Logs"
            aria-pressed={currentPage === 'logs'}
            onClick={() => onPageChange('logs')}
          >
            <List className="size-6" />
          </Button>
        </SidebarHeader>

        <SidebarFooter className="mt-auto items-center p-1">
          <Button
            className="relative cursor-pointer"
            variant="ghost"
            size="icon-lg"
            aria-label={updateStatus.message}
            title={updateStatus.message}
            disabled={isUpdateBusy || !hasUpdate}
            onClick={handleUpdateClick}
          >
            {showUpdateBadge && (
              <Badge
                className={cn(
                  'size-4 pointer-events-none absolute -right-0.5 bottom-0 z-10 min-w-5 rounded-full px-1 text-white tabular-nums shadow-sm',
                  hasUpdateError ? 'bg-red-600' : 'bg-blue-600',
                  isUpdateChecking && 'animate-pulse'
                )}
                aria-hidden="true"
              >
                {updateBadgeText}
              </Badge>
            )}
            <ArrowUpFromLine className="size-6" />
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}

export { AppSidebar }
export type { AppPage }
