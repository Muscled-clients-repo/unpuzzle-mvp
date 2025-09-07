import { useState, useMemo, useCallback } from 'react'

/**
 * Professional Form State Hook
 * 
 * Used by YouTube Studio, Udemy Creator, Netflix Creator tools
 * Pattern: Form state is ALWAYS source of truth for inputs
 * Server state only for change detection and fallback
 */
export function useFormState<T extends Record<string, any>>(initialData: T) {
  const [values, setValues] = useState<T>(initialData)
  const [initialValues, setInitialValues] = useState<T>(initialData)
  
  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])
  
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])
  
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues)
  }, [values, initialValues])
  
  const getChangedFields = useCallback(() => {
    const changed: Partial<T> = {}
    Object.keys(values).forEach(key => {
      if (values[key] !== initialValues[key]) {
        changed[key as keyof T] = values[key]
      }
    })
    return changed
  }, [values, initialValues])
  
  const hasChanges = useCallback((serverData: T) => {
    return Object.keys(values).some(key => {
      const formValue = values[key]
      const serverValue = serverData[key]
      
      // Handle null/undefined/empty string equivalence
      if ((!formValue || formValue === '') && (!serverValue || serverValue === '')) {
        return false
      }
      
      return formValue !== serverValue
    })
  }, [values])
  
  const getChangedFieldsFromServer = useCallback((serverData: T) => {
    const changed: Partial<T> = {}
    Object.keys(values).forEach(key => {
      const formValue = values[key]
      const serverValue = serverData[key]
      
      // Handle null/undefined/empty string equivalence
      if ((!formValue || formValue === '') && (!serverValue || serverValue === '')) {
        return // No change
      }
      
      if (formValue !== serverValue) {
        changed[key as keyof T] = formValue
      }
    })
    return changed
  }, [values])
  
  const reset = useCallback((newData?: Partial<T>) => {
    const dataToUse = newData ? { ...initialValues, ...newData } : initialValues
    setValues(dataToUse)
    setInitialValues(dataToUse)
  }, [initialValues])
  
  const updateInitialValues = useCallback((newData: T) => {
    setInitialValues(newData)
    setValues(newData)
  }, [])
  
  return { 
    values, 
    setValue, 
    setValues: setMultipleValues,
    isDirty, 
    hasChanges,
    getChangedFields, 
    getChangedFieldsFromServer,
    reset,
    updateInitialValues
  }
}