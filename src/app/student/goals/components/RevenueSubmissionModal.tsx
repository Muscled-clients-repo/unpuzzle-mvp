'use client'

import React, { useState } from 'react'
import { DollarSign, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitRevenueProof } from '@/app/actions/revenue-actions'
import { toast } from 'sonner'

interface RevenueSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  trackType: 'agency' | 'saas'
  onSuccess?: () => void
}

export function RevenueSubmissionModal({
  isOpen,
  onClose,
  conversationId,
  trackType,
  onSuccess
}: RevenueSubmissionModalProps) {
  const [amount, setAmount] = useState('')
  const [proofVideoUrl, setProofVideoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!proofVideoUrl.trim()) {
      toast.error('Please provide a proof video URL')
      return
    }

    // Validate URL format
    try {
      new URL(proofVideoUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitRevenueProof({
        conversationId,
        amount: numAmount,
        proofVideoUrl: proofVideoUrl.trim(),
        trackType
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Revenue proof submitted successfully!')
      setAmount('')
      setProofVideoUrl('')
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error submitting revenue proof:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('')
      setProofVideoUrl('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Submit Revenue Proof
          </DialogTitle>
          <DialogDescription>
            Submit proof of your {trackType === 'agency' ? 'total revenue earned' : 'monthly recurring revenue (MRR)'}.
            Your instructor will review and approve your submission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {trackType === 'agency' ? 'Revenue Earned' : 'Current MRR'} ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                disabled={isSubmitting}
                required
              />
            </div>
            {trackType === 'saas' && (
              <p className="text-xs text-gray-500">
                Enter your last 30 days revenue. Your MRR will only increase if this amount is higher than your current MRR.
              </p>
            )}
          </div>

          {/* Proof Video URL */}
          <div className="space-y-2">
            <Label htmlFor="proofUrl">Proof Video URL</Label>
            <Input
              id="proofUrl"
              type="url"
              placeholder="https://loom.com/share/... or iCloud link"
              value={proofVideoUrl}
              onChange={(e) => setProofVideoUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-500">
              Record a Loom video or iPhone screen recording showing your revenue/earnings.
              Make sure to refresh the page in the recording to show real-time data.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
