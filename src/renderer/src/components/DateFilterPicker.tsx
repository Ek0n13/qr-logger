import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { LogButton } from '@renderer/components/AppFormControls'
import { Calendar } from '@renderer/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'

type DateFilterPickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function parseDateFilterValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return undefined
  }

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function formatDateFilterValue(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateFilterLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return value
  }

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

function DateFilterPicker({ label, value, onChange }: DateFilterPickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseDateFilterValue(value)

  function handleSelect(date: Date | undefined): void {
    if (!date) {
      return
    }

    onChange(formatDateFilterValue(date))
    setIsOpen(false)
  }

  function handleClear(): void {
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <span>{label}</span>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <LogButton type="button" variant="outline" className="bg-white" data-empty={!value} />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? formatDateFilterLabel(value) : <span>Pick date</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            captionLayout="dropdown"
          />
          <div className="flex gap-2 border-t p-2">
            <LogButton
              type="button"
              size="sm"
              className="w-full"
              disabled={!value}
              onClick={handleClear}
            >
              Clear
            </LogButton>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DateFilterPicker }
