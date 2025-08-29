"use client"

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, AlertCircle, CreditCard } from 'lucide-react'

// Initialize Stripe outside of component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentFormProps {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
  loading?: boolean
}

function PaymentForm({ clientSecret, amount, onSuccess, onError, loading = false }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setPaymentError(null)

    const cardNumberElement = elements.getElement(CardNumberElement)

    if (!cardNumberElement) {
      setPaymentError('Card number element not found')
      setProcessing(false)
      return
    }

    try {
      // Confirm the payment with the card number element
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            // Add billing details if needed
          }
        }
      })

      if (error) {
        console.error('Payment failed:', error)
        setPaymentError(error.message || 'Payment failed')
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment successful:', paymentIntent)
        onSuccess()
      }
    } catch (err) {
      console.error('Payment error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setPaymentError(errorMessage)
      onError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  // Shared styling for all Stripe elements
  const elementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Form Header */}
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h4 className="font-medium text-gray-900">Payment Information</h4>
      </div>

      {/* Individual Stripe Elements */}
      <div className="space-y-4">
        {/* Card Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Card Number
          </label>
          <div className="p-4 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
            <CardNumberElement options={elementOptions} />
          </div>
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Expiry Date
            </label>
            <div className="p-4 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
              <CardExpiryElement options={elementOptions} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              CVC
            </label>
            <div className="p-4 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
              <CardCvcElement options={elementOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Error */}
      {paymentError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
        <Check className="h-4 w-4 text-green-600" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      {/* Payment Button */}
      <Button
        type="submit"
        disabled={!stripe || processing || loading}
        className="w-full"
      >
        {processing ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${(amount / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  )
}

interface StripePaymentFormProps {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
  loading?: boolean
}

export function StripePaymentForm({ 
  clientSecret, 
  amount, 
  onSuccess, 
  onError, 
  loading = false 
}: StripePaymentFormProps) {
  const [stripeError, setStripeError] = useState<string | null>(null)

  useEffect(() => {
    // Check if Stripe publishable key is available
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setStripeError('Stripe configuration is missing')
    }
  }, [])

  if (stripeError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {stripeError}. Please check your Stripe configuration.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        loading={loading}
      />
    </Elements>
  )
}