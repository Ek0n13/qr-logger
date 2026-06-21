import { tryCatch } from '@maxmorozoff/try-catch-tuple'
import { PenLine } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AppInput, LogButton } from '@renderer/components/AppFormControls'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'

type QrLogRecord = Awaited<ReturnType<(typeof window.api.qrLogs)['list']>>[number]

type EditQrLogDialogProps = {
  log: QrLogRecord
  onUpdated: (log: QrLogRecord) => void
}

function EditQrLogDialog({ log, onUpdated }: EditQrLogDialogProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(log.name)
  const [product, setProduct] = useState(log.product)
  const [isSaving, setIsSaving] = useState(false)

  function handleOpenChange(nextIsOpen: boolean): void {
    if (isSaving) {
      return
    }

    if (nextIsOpen) {
      setName(log.name)
      setProduct(log.product)
    }

    setIsOpen(nextIsOpen)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextName = name.trim()
    const nextProduct = product.trim()

    if (!nextName || !nextProduct) {
      return
    }

    if (nextName === log.name && nextProduct === log.product) {
      setIsOpen(false)
      return
    }

    setIsSaving(true)
    const [updatedLog, error] = await tryCatch.async(
      () =>
        window.api.qrLogs.update({
          qrCode: log.qrCode,
          name: nextName,
          product: nextProduct
        }),
      'Update QR log'
    )
    setIsSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (!updatedLog) {
      toast.error('QR log was not found or was already deleted')
      return
    }

    onUpdated(updatedLog)
    setIsOpen(false)
    toast.success('QR log updated')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <LogButton type="button" variant="default" size="sm" aria-label={`Edit ${log.name}`} />
        }
      >
        <PenLine className="size-6" />
      </DialogTrigger>
      <DialogContent className="bg-zinc-200">
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editing Row</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 ">
            <label
              className="flex flex-col gap-1 text-sm font-medium"
              htmlFor={`edit-name-${log.id}`}
            >
              Name
              <AppInput
                id={`edit-name-${log.id}`}
                value={name}
                placeholder="Name"
                required
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label
              className="flex flex-col gap-1 text-sm font-medium"
              htmlFor={`edit-product-${log.id}`}
            >
              Product
              <AppInput
                id={`edit-product-${log.id}`}
                value={product}
                placeholder="Product"
                required
                onChange={(event) => setProduct(event.target.value)}
              />
            </label>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  className="cursor-pointer bg-zinc-800 text-white"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant="outline"
              className="cursor-pointer bg-white"
              disabled={isSaving || !name.trim() || !product.trim()}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { EditQrLogDialog }
