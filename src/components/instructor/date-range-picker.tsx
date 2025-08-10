"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppStore } from "@/stores/app-store"

const presetOptions = [
  { label: "Today", value: "today", days: 0 },
  { label: "Yesterday", value: "yesterday", days: 1 },
  { label: "Last 7 days", value: "7days", days: 7 },
  { label: "Last 30 days", value: "30days", days: 30 },
  { label: "Last 90 days", value: "90days", days: 90 },
]

export function DateRangePicker({ className }: { className?: string }) {
  const { dateRange, setDateRange } = useAppStore()
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  })
  const [isOpen, setIsOpen] = React.useState(false)

  const handlePresetSelect = (preset: string) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    let from: Date
    let to = today
    
    switch (preset) {
      case "today":
        from = new Date()
        from.setHours(0, 0, 0, 0)
        break
      case "yesterday":
        from = new Date(Date.now() - 24 * 60 * 60 * 1000)
        from.setHours(0, 0, 0, 0)
        to = new Date(Date.now() - 24 * 60 * 60 * 1000)
        to.setHours(23, 59, 59, 999)
        break
      case "7days":
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        from.setHours(0, 0, 0, 0)
        break
      case "30days":
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        from.setHours(0, 0, 0, 0)
        break
      case "90days":
        from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        from.setHours(0, 0, 0, 0)
        break
      default:
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        from.setHours(0, 0, 0, 0)
    }
    
    setDate({ from, to })
    setDateRange({ 
      from, 
      to, 
      preset: preset as any 
    })
    setIsOpen(false)
  }

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    if (newDate?.from && newDate?.to) {
      setDateRange({
        from: newDate.from,
        to: newDate.to,
        preset: 'custom'
      })
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={dateRange.preset} onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select preset" />
        </SelectTrigger>
        <SelectContent>
          {presetOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}