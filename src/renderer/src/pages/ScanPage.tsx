import { tryCatch } from '@maxmorozoff/try-catch-tuple'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AppInput, ScanButton } from '@renderer/components/AppFormControls'
import {
  Autocomplete,
  AutocompleteItem,
  ComboboxContent,
  ComboboxInput,
  ComboboxList
} from '@renderer/components/ui/combobox'

// type ScanButtonProps = React.ComponentProps<typeof Button>

type SuggestionFetcher = (query: string) => Promise<string[]>

type SuggestionComboboxInputProps = {
  'aria-label': string
  onValueChange: (value: string) => void
  placeholder: string
  required?: boolean
  suggestions: string[]
  value: string
}

// function ScanButton({
//   className,
//   variant = 'outline',
//   ...props
// }: ScanButtonProps): React.JSX.Element {
//   return (
//     <Button
//       variant={variant}
//       className={cn('cursor-pointer bg-zinc-700 text-zinc-100', className)}
//       {...props}
//     />
//   )
// }

function SuggestionComboboxInput({
  onValueChange,
  placeholder,
  suggestions,
  value,
  ...props
}: SuggestionComboboxInputProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const hasSuggestions = value.trim().length > 0 && suggestions.length > 0

  return (
    <Autocomplete
      filter={null}
      items={suggestions}
      open={isOpen && hasSuggestions}
      value={value}
      onOpenChange={setIsOpen}
      onValueChange={(nextValue) => {
        onValueChange(nextValue)
        setIsOpen(true)
      }}
    >
      <ComboboxInput
        className="w-full flex-1 bg-white"
        placeholder={placeholder}
        showTrigger={false}
        {...props}
      />

      {hasSuggestions ? (
        <ComboboxContent className="rounded-md bg-white py-1">
          <ComboboxList>
            {(suggestion) => (
              <AutocompleteItem
                key={suggestion}
                value={suggestion}
                className="data-highlighted:bg-zinc-200"
              >
                {suggestion}
              </AutocompleteItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      ) : null}
    </Autocomplete>
  )
}

function useAutocompleteSuggestions(
  value: string,
  fetchSuggestions: SuggestionFetcher
): { isLoading: boolean; suggestions: string[] } {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const query = value.trim()
    const requestId = ++requestIdRef.current

    async function loadSuggestions(): Promise<void> {
      if (!query) {
        if (requestId === requestIdRef.current) {
          setSuggestions([])
          setIsLoading(false)
        }

        return
      }

      setIsLoading(true)
      const [nextSuggestions, error] = await tryCatch.async(
        () => fetchSuggestions(query),
        'Fetch autocomplete suggestions'
      )

      if (requestId !== requestIdRef.current) {
        return
      }

      setIsLoading(false)
      setSuggestions(error ? [] : nextSuggestions)
    }

    const timeoutId = window.setTimeout(
      () => {
        void loadSuggestions()
      },
      query ? 200 : 0
    )

    return () => window.clearTimeout(timeoutId)
  }, [fetchSuggestions, value])

  return { isLoading, suggestions }
}

function getNameSuggestions(query: string): Promise<string[]> {
  return window.api.qrLogs.suggestNames(query)
}

function getProductSuggestions(query: string): Promise<string[]> {
  return window.api.qrLogs.suggestProducts(query)
}

function isActiveQrLog(record: Awaited<ReturnType<(typeof window.api.qrLogs)['get']>>): boolean {
  return record?.deleted === null
}

function ScanPage(): React.JSX.Element {
  const [qrCode, setQrCode] = useState('')
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [qrCodeExists, setQrCodeExists] = useState(false)
  const [isCheckingQrCode, setIsCheckingQrCode] = useState(false)
  const [isSavingQrCode, setIsSavingQrCode] = useState(false)
  const { suggestions: nameSuggestions } = useAutocompleteSuggestions(name, getNameSuggestions)
  const { suggestions: productSuggestions } = useAutocompleteSuggestions(
    product,
    getProductSuggestions
  )

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
      () => window.api.qrLogs.get(nextQrCode),
      'Check QR code'
    )
    setIsCheckingQrCode(false)

    if (error) {
      toast.error(error.message)
      setShowNameInput(false)
      return
    }

    const activeQrCodeExists = isActiveQrLog(existingQrCode)

    setQrCodeExists(activeQrCodeExists)
    setShowNameInput(!activeQrCodeExists)
  }

  async function handleNameSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextQrCode = qrCode.trim()
    const nextName = name.trim()
    const nextProduct = product.trim()

    if (!nextQrCode || !nextName || !nextProduct) {
      return
    }

    setIsSavingQrCode(true)
    const [, error] = await tryCatch.async(
      () =>
        window.api.qrLogs.create({
          qrCode: nextQrCode,
          name: nextName,
          product: nextProduct || undefined
        }),
      'Create QR code'
    )
    setIsSavingQrCode(false)

    if (error) {
      const [existingQrCode] = await tryCatch.async(
        () => window.api.qrLogs.get(nextQrCode),
        'Check QR code after create failure'
      )

      if (!isActiveQrLog(existingQrCode)) {
        toast.error(error.message)
        return
      }

      setQrCodeExists(true)
      setShowNameInput(false)
      return
    }

    toast.success('QR code added successfully')
    setName('')
    setProduct('')
    setQrCode('')
    setShowNameInput(false)
    setQrCodeExists(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="flex w-full max-w-xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Scan page</h1>
          <p className="text-muted-foreground text-sm">
            Enter a QR code, then assign a name and product to it.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <form className="flex gap-2" onSubmit={handleQrCodeSubmit}>
            <AppInput
              type="search"
              autoFocus
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
              <ArrowRight className="size-4" />
            </ScanButton>
          </form>

          {qrCodeExists ? (
            <p className="text-red-500 text-sm italic">QR code already exists</p>
          ) : null}

          {showNameInput ? (
            <form
              className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-2 duration-200 ease-in sm:flex-row"
              onSubmit={handleNameSubmit}
            >
              <SuggestionComboboxInput
                suggestions={nameSuggestions}
                value={name}
                placeholder="Name"
                aria-label="Name"
                required
                onValueChange={setName}
              />
              <SuggestionComboboxInput
                suggestions={productSuggestions}
                value={product}
                placeholder="Product"
                aria-label="Product"
                required
                onValueChange={setProduct}
              />
              <ScanButton
                type="submit"
                disabled={isSavingQrCode || !name.trim() || !product.trim()}
              >
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
