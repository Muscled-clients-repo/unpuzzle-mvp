"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, X, Percent } from 'lucide-react'

interface CouponInputProps {
  value: string
  onChange: (value: string) => void
  onApply?: (coupon: string) => Promise<{ valid: boolean; discount?: number; message?: string }>
  disabled?: boolean
}

export function CouponInput({ value, onChange, onApply, disabled = false }: CouponInputProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApplyCoupon = async () => {
    if (!value.trim() || !onApply) return
    
    setIsApplying(true)
    setError(null)
    
    try {
      const result = await onApply(value.trim())
      
      if (result.valid && result.discount) {
        setAppliedCoupon({ code: value.trim(), discount: result.discount })
        setError(null)
      } else {
        setError(result.message || 'Invalid coupon code')
        setAppliedCoupon(null)
      }
    } catch (err) {
      setError('Failed to apply coupon')
      setAppliedCoupon(null)
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setError(null)
    onChange('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApplyCoupon()
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="coupon-code">Coupon Code (Optional)</Label>
      
      {appliedCoupon ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-4 w-4 text-green-600" />
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {appliedCoupon.code.toUpperCase()}
          </Badge>
          <span className="text-sm text-green-700">
            {appliedCoupon.discount}% discount applied
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveCoupon}
            className="ml-auto h-auto p-1"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              placeholder="Enter coupon code"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={disabled || isApplying}
              className="flex-1"
            />
            {onApply && (
              <Button
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={!value.trim() || disabled || isApplying}
                size="default"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Percent className="h-4 w-4 mr-2" />
                    Apply
                  </>
                )}
              </Button>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}