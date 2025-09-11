import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
  
  // Optional tag autocomplete functionality
  showSuggestions?: boolean
  onShowSuggestions?: (show: boolean) => void
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
  suggestionsLabel?: string
}

/**
 * Phase 2A: Reusable SearchInput Component
 * Extracted from MediaFiltersSection for use across all instructor pages
 * 
 * Features:
 * - Search icon positioning
 * - Optional tag autocomplete suggestions
 * - Consistent styling and behavior
 */
export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  className,
  showSuggestions = false,
  onShowSuggestions,
  suggestions = [],
  onSuggestionClick,
  suggestionsLabel = "Suggestions:"
}: SearchInputProps) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (onShowSuggestions) {
            onShowSuggestions(e.target.value.length > 0)
          }
        }}
        onFocus={() => {
          if (onShowSuggestions) {
            onShowSuggestions(value.length > 0)
          }
        }}
        onBlur={() => {
          if (onShowSuggestions) {
            setTimeout(() => onShowSuggestions(false), 200)
          }
        }}
        className="pl-10"
      />
      
      {/* Optional Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg">
          <div className="p-2 text-xs text-muted-foreground border-b">
            {suggestionsLabel}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                <Badge variant="secondary" className="text-xs">
                  {suggestion}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Search by tag
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}