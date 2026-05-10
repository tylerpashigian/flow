import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  buttonClassName?: string
  disabled?: boolean
  calendarProps?: Omit<ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  buttonClassName,
  disabled = false,
  calendarProps,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!value}
            className={cn(
              'justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
              buttonClassName,
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value ? format(value, 'PPP') : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}
