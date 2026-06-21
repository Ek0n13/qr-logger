import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { LogButton } from '@renderer/components/AppFormControls'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'

type QrLogRecord = Awaited<ReturnType<(typeof window.api.qrLogs)['list']>>[number]

type DeleteQrLogDialogProps = {
  log: QrLogRecord
  onDeleted: (log: QrLogRecord) => Promise<boolean>
}

function DeleteQrLogDialog({ log, onDeleted }: DeleteQrLogDialogProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleOpenChange(nextIsOpen: boolean): void {
    if (isDeleting) {
      return
    }

    setIsOpen(nextIsOpen)
  }

  async function handleDelete(): Promise<void> {
    setIsDeleting(true)
    const wasDeleted = await onDeleted(log)
    setIsDeleting(false)

    if (wasDeleted) {
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <LogButton
            type="button"
            variant="default"
            className="text-red-700"
            size="sm"
            aria-label={`Delete ${log.name}`}
          />
        }
      >
        <Trash2 className="size-6" />
      </DialogTrigger>
      <DialogContent className="bg-zinc-100">
        <DialogHeader>
          <DialogTitle>Delete QR log?</DialogTitle>
          <DialogDescription>
            This will remove {log.name} from the logs list. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                className="cursor-pointer bg-zinc-800 text-white"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer bg-white text-red-700"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? 'Deleting...' : 'Delete log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteQrLogDialog }
