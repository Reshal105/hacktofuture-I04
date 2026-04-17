'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentRecord {
  id: number
  timestamp: string
  amount: number
  status: string
  method: string
  reference: string
  description?: string
}

interface PaymentPanelProps {
  amount: number
  meterId: string
}

export function PaymentPanel({ amount, meterId }: PaymentPanelProps) {
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const formattedAmount = useMemo(() => amount.toFixed(2), [amount])

  const fetchHistory = async () => {
    try {
      const data = await apiFetch<{ payments: PaymentRecord[] }>('/api/payments')
      setHistory(data.payments || [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handlePayment = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setIsProcessing(true)

    try {
      const result = await apiFetch<{ payment: PaymentRecord }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method: 'card',
          description: `Utility bill payment for meter ${meterId}`,
        }),
      })

      // Open Razorpay checkout
      const options = {
        key: result.payment.key,
        amount: result.payment.amount * 100, // Razorpay expects amount in paisa
        currency: 'INR',
        name: 'Smart Grid Billing',
        description: result.payment.description,
        order_id: result.payment.order_id,
        handler: async (response: any) => {
          // Payment successful, verify with backend
          try {
            await apiFetch('/api/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: result.payment.amount * 100,
              }),
            })

            setStatusMessage(`Payment successful — reference ${response.razorpay_payment_id}`)
            await fetchHistory()
          } catch (verifyError) {
            setErrorMessage('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: 'User',
          email: 'user@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3b82f6', // Primary blue color
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            setErrorMessage('Payment cancelled by user.')
          },
        },
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()

    } catch (error) {
      setErrorMessage((error as Error)?.message || 'Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="metric-card">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payments</p>
          <h3 className="text-lg font-semibold text-foreground mt-1">Bill payment</h3>
        </div>
        <CreditCard size={20} className="text-primary" />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <p className="text-xs font-medium text-muted-foreground">Amount due</p>
          <p className="mt-2 text-3xl font-bold text-foreground">₹{formattedAmount}</p>
          <p className="text-sm text-muted-foreground mt-1">Based on current daily consumption</p>
        </div>

        <button
          type="button"
          onClick={handlePayment}
          disabled={isProcessing || amount <= 0}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isProcessing ? 'Processing payment...' : 'Pay bill now'}
        </button>

        {statusMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-3">
            <CheckCircle2 size={18} className="flex-shrink-0" /> {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-3">
            <XCircle size={18} className="flex-shrink-0" /> {errorMessage}
          </div>
        )}

        <div className="rounded-lg border border-border bg-background/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-4">Recent transactions</p>
          <div className="space-y-3">
            {history.slice(0, 3).map((record) => (
              <div key={record.id} className="rounded-lg border border-border p-3 bg-card/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">₹{record.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{record.description}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    record.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {record.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{new Date(record.timestamp).toLocaleString()}</p>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">No payment history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
