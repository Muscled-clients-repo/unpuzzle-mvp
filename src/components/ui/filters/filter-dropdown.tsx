import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
  count?: number
  divider?: boolean // Add divider after this option
}

interface FilterDropdownProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: FilterOption[]
  width?: string
  icon?: React.ReactNode
  className?: string
}

/**
 * Phase 2A: Reusable FilterDropdown Component
 * Extracted from MediaFiltersSection for use across all instructor pages
 * 
 * Features:
 * - Consistent select styling
 * - Optional count badges
 * - Optional dividers between sections
 * - Configurable width and icon
 */
export function FilterDropdown({
  value,
  onChange,
  placeholder,
  options,
  width = "w-[180px]",
  icon,
  className
}: FilterDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(width, className)}>
        {icon && <span className="mr-2">{icon}</span>}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, index) => (
          <div key={`${option.value}-${index}`}>
            <SelectItem value={option.value}>
              {option.count !== undefined ? (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{option.label}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {option.count}
                  </Badge>
                </div>
              ) : (
                <span>{option.label}</span>
              )}
            </SelectItem>
            {option.divider && (
              <div className="my-1 h-px bg-border" />
            )}
          </div>
        ))}
      </SelectContent>
    </Select>
  )
}