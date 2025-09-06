import { useState, useCallback, useEffect } from 'react'

interface UseClickToEditOptions {
  initialValue: string
  onSave: (value: string) => void
  onCancel?: () => void
  onTabNext?: () => void
  onTabPrevious?: () => void
  onChange?: (value: string) => void
}

export function useClickToEdit({ initialValue, onSave, onCancel, onTabNext, onTabPrevious, onChange }: UseClickToEditOptions) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)

  // Update value when initialValue changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // Calculate cursor position based on click location
  const calculateCursorPosition = useCallback((e: React.MouseEvent, text: string): number => {
    const element = e.currentTarget as HTMLElement
    const rect = element.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span')
    tempSpan.style.font = window.getComputedStyle(element).font
    tempSpan.style.position = 'absolute'
    tempSpan.style.visibility = 'hidden'
    tempSpan.style.whiteSpace = 'pre'
    document.body.appendChild(tempSpan)
    
    let position = 0
    for (let i = 0; i <= text.length; i++) {
      tempSpan.textContent = text.substring(0, i)
      if (tempSpan.offsetWidth >= clickX) {
        position = i
        break
      }
      position = i
    }
    
    document.body.removeChild(tempSpan)
    return position
  }, [])

  const startEdit = useCallback((e?: React.MouseEvent, clickPosition?: number | 'start' | 'end') => {
    if (e && clickPosition === undefined) {
      const position = calculateCursorPosition(e, initialValue)
      setCursorPosition(position)
    } else if (clickPosition === 'start') {
      setCursorPosition(0)
    } else if (clickPosition === 'end') {
      setCursorPosition(initialValue.length)
    } else {
      setCursorPosition(clickPosition ?? null)
    }
    setIsEditing(true)
    setValue(initialValue)
  }, [initialValue, calculateCursorPosition])

  const saveEdit = useCallback(() => {
    if (value.trim() && value.trim() !== initialValue) {
      onSave(value.trim())
    }
    setIsEditing(false)
    setCursorPosition(null)
  }, [value, initialValue, onSave])

  const cancelEdit = useCallback(() => {
    setValue(initialValue)
    setIsEditing(false)
    setCursorPosition(null)
    onCancel?.()
  }, [initialValue, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Save current changes first
      if (value.trim()) {
        onSave(value.trim())
      }
      setIsEditing(false)
      setCursorPosition(null)
      
      // Navigate to next/previous field
      if (e.shiftKey && onTabPrevious) {
        onTabPrevious()
      } else if (!e.shiftKey && onTabNext) {
        onTabNext()
      }
    }
  }, [saveEdit, cancelEdit, value, onSave, onTabNext, onTabPrevious])

  const handleBlur = useCallback(() => {
    if (value.trim()) {
      saveEdit()
    } else {
      cancelEdit()
    }
  }, [value, saveEdit, cancelEdit])

  const inputRef = useCallback((input: HTMLInputElement | null) => {
    if (input && isEditing) {
      input.focus()
      if (cursorPosition !== null) {
        const pos = cursorPosition
        setTimeout(() => {
          input.setSelectionRange(pos, pos)
        }, 0)
        // Clear cursor position after setting it so it doesn't interfere with typing
        setCursorPosition(null)
      }
    }
  }, [isEditing, cursorPosition])

  // Enhanced setValue that calls onChange (but throttled to prevent issues)
  const setValueWithCallback = useCallback((newValue: string) => {
    setValue(newValue)
    // Use a ref to avoid causing re-renders during typing
    if (onChange) {
      setTimeout(() => onChange(newValue), 0)
    }
  }, [onChange])

  return {
    isEditing,
    value,
    setValue: setValueWithCallback,
    startEdit,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    handleBlur,
    inputRef
  }
}