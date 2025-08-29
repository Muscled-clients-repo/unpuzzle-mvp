"use client"

import { CreditCard, Wallet } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface PaymentMethodSelectorProps {
  value: 'credit_card' | 'paypal' | 'stripe'
  onChange: (method: 'credit_card' | 'paypal' | 'stripe') => void
  disabled?: boolean
}

export function PaymentMethodSelector({ value, onChange, disabled = false }: PaymentMethodSelectorProps) {
  const paymentMethods = [
    {
      id: 'credit_card' as const,
      name: 'Credit Card',
      description: 'Pay with your credit or debit card',
      icon: CreditCard,
      available: true
    },
    {
      id: 'paypal' as const,
      name: 'PayPal',
      description: 'Pay securely with your PayPal account',
      icon: Wallet,
      available: false // Coming soon
    },
    {
      id: 'stripe' as const,
      name: 'Stripe',
      description: 'Secure payment processing',
      icon: CreditCard,
      available: false // Coming soon
    }
  ]

  return (
    <div className="space-y-3">
      <Label>Payment Method</Label>
      <div className="grid gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon
          const isSelected = value === method.id
          const isDisabled = disabled || !method.available

          return (
            <Card
              key={method.id}
              className={`
                relative cursor-pointer transition-all
                ${isSelected 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => {
                if (!isDisabled) {
                  onChange(method.id)
                }
              }}
            >
              <div className="flex items-start gap-4 p-4">
                <div className={`
                  mt-0.5 h-4 w-4 rounded-full border-2 transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary' 
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && (
                    <div className="h-full w-full rounded-full bg-white scale-[0.4]" />
                  )}
                </div>
                
                <Icon className={`
                  h-5 w-5 mt-0.5
                  ${isSelected ? 'text-primary' : 'text-gray-500'}
                `} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`
                      font-medium
                      ${isSelected ? 'text-primary' : 'text-gray-900'}
                    `}>
                      {method.name}
                    </span>
                    {!method.available && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {method.description}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        🔒 All payments are processed securely and encrypted
      </p>
    </div>
  )
}