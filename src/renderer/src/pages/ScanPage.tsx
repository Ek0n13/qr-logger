import { tryCatch } from '@maxmorozoff/try-catch-tuple'
import { useState } from 'react'
import { toast } from 'sonner'

import { AppInput } from '@renderer/components/AppFormControls'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type ScanButtonProps = React.ComponentProps<typeof Button>

function ScanButton({
  className,
  variant = 'outline',
  ...props
}: ScanButtonProps): React.JSX.Element {
  return (
    <Button
      variant={variant}
      className={cn('cursor-pointer bg-zinc-700 text-zinc-100', className)}
      {...props}
    />
  )
}

function ScanPage(): React.JSX.Element {
  const [qrCode, setQrCode] = useState('')
  const [name, setName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [qrCodeExists, setQrCodeExists] = useState(false)
  const [isCheckingQrCode, setIsCheckingQrCode] = useState(false)
  const [isSavingQrCode, setIsSavingQrCode] = useState(false)

  async function handleQrCodeSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextQrCode = qrCode.trim()

    if (!nextQrCode) {
      setShowNameInput(false)
      setQrCodeExists(false)
      return
    }

    setIsCheckingQrCode(true)
    const [existingQrCode, error] = await tryCatch.async(
      () => window.api.qrLogs.get(nextQrCode, true),
      'Check QR code'
    )
    setIsCheckingQrCode(false)

    if (error) {
      toast.error(error.message)
      setShowNameInput(false)
      return
    }

    setQrCodeExists(Boolean(existingQrCode))
    setShowNameInput(!existingQrCode)
  }

  async function handleNameSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextQrCode = qrCode.trim()
    const nextName = name.trim()

    if (!nextQrCode || !nextName) {
      return
    }

    setIsSavingQrCode(true)
    const [, error] = await tryCatch.async(
      () => window.api.qrLogs.create({ qrCode: nextQrCode, name: nextName }),
      'Create QR code'
    )
    setIsSavingQrCode(false)

    if (error) {
      setQrCodeExists(true)
      setShowNameInput(false)
      return
    }

    toast.success('QR code added successfully')
    setName('')
    setQrCode('')
    setShowNameInput(false)
    setQrCodeExists(false)
  }

  return (
    <main className="flex min-h-screen justify-center px-6 py-16">
      <section className="flex w-full max-w-xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Scan page</h1>
          <p className="text-muted-foreground text-sm">
            Enter a QR code, then assign a name to it.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <form className="flex gap-2" onSubmit={handleQrCodeSubmit}>
            <AppInput
              type="search"
              value={qrCode}
              placeholder="QR code"
              aria-label="QR code"
              onChange={(event) => {
                setQrCode(event.target.value)
                setQrCodeExists(false)
                setShowNameInput(false)
              }}
            />
            <ScanButton type="submit" disabled={isCheckingQrCode || !qrCode.trim()}>
              add qr code
            </ScanButton>
          </form>

          {qrCodeExists ? <p className="text-destructive text-sm">QR code already exists</p> : null}

          {showNameInput ? (
            <form className="flex gap-2" onSubmit={handleNameSubmit}>
              <AppInput
                value={name}
                placeholder="Name"
                aria-label="Name"
                onChange={(event) => setName(event.target.value)}
              />
              <ScanButton type="submit" disabled={isSavingQrCode || !name.trim()}>
                submit
              </ScanButton>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export { ScanPage }
