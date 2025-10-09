'use client'

import React, { useState } from 'react'
import { CheckCircle, X, ExternalLink, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { reviewRevenueSubmission } from '@/app/actions/revenue-actions'
import { toast } from 'sonner'

interface RevenueReviewModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string
  studentName?: string
  trackType: 'agency' | 'saas'
  submittedAmount: number
  proofVideoUrl: string
  onSuccess?: () => void
}

export function RevenueReviewModal({
  isOpen,
  onClose,
  messageId,
  studentName,
  trackType,
  submittedAmount,
  proofVideoUrl,
  onSuccess
}: RevenueReviewModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprove = async () => {
    setIsSubmitting(true)

    try {
      const result = await reviewRevenueSubmission({
        messageId,
        approved: true
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Approved! ${studentName ? studentName + "'s" : 'Student'} revenue updated.`)
      setRejectionReason('')
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error approving submission:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await reviewRevenueSubmission({
        messageId,
        approved: false,
        rejectionReason: rejectionReason.trim()
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Submission rejected')
      setRejectionReason('')
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error rejecting submission:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Review Revenue Submission
          </DialogTitle>
          <DialogDescription>
            {studentName && `${studentName} submitted `}
            {trackType === 'agency' ? 'total revenue earned' : 'monthly recurring revenue (MRR)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Amount Display */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {trackType === 'agency' ? 'Revenue Earned' : 'Current MRR'}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ${submittedAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {trackType === 'saas' && 'Last 30 days revenue'}
            </div>
          </div>

          {/* Proof Video Link */}
          <div className="space-y-2">
            <Label>Proof Video</Label>
            <a
              href={proofVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 hover:underline truncate">
                {proofVideoUrl}
              </span>
            </a>
            <p className="text-xs text-gray-500">
              Click to open proof video in a new tab
            </p>
          </div>

          {/* Rejection Reason (only show when rejecting) */}
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">
              Rejection Reason (optional for approval, required for rejection)
            </Label>
            <Textarea
              id="rejectionReason"
              placeholder="E.g., Video quality too low, revenue not verifiable, need clearer proof..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
