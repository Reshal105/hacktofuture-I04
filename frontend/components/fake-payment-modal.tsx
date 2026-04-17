'use client'

import { useState } from 'react'

interface Props {
  amount: number
  onClose: () => void
  onSuccess: (ref: string) => void
}

export function FakePaymentModal({ amount, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'options' | 'processing' | 'success'>('options')
  const [method, setMethod] = useState<'upi' | 'card'>('upi')

  const handlePay = () => {
    setStep('processing')

    setTimeout(() => {
      setStep('success')

      const ref = "order_" + Math.random().toString(36).substring(2, 12)
      onSuccess(ref)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-[350px] shadow-xl">

        {step === 'options' && (
          <>
            <h2 className="text-lg font-semibold mb-4">Pay ₹{amount}</h2>

            <div className="space-y-3">

              {/* UPI OPTION */}
              <button
                onClick={() => setMethod('upi')}
                className={`w-full p-3 rounded-lg border ${method === 'upi' ? 'border-green-500' : ''}`}
              >
                UPI / QR
              </button>

              {/* CARD OPTION */}
              <button
                onClick={() => setMethod('card')}
                className={`w-full p-3 rounded-lg border ${method === 'card' ? 'border-green-500' : ''}`}
              >
                Card
              </button>

              {/* MOCK INPUTS */}
              {method === 'upi' ? (
                <div className="text-sm text-gray-500">
                  Scan QR or enter UPI ID (demo)
                </div>
              ) : (
                <div className="space-y-2">
                  <input placeholder="Card Number" className="w-full border p-2 rounded" />
                  <input placeholder="MM/YY" className="w-full border p-2 rounded" />
                  <input placeholder="CVV" className="w-full border p-2 rounded" />
                </div>
              )}

              <button
                onClick={handlePay}
                className="w-full bg-green-600 text-white py-2 rounded-lg mt-3"
              >
                Pay Now
              </button>

              <button
                onClick={onClose}
                className="w-full text-sm text-gray-500 mt-2"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center">
            <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-green-500 rounded-full mx-auto mb-4" />
            <p>Processing payment...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center text-green-600">
            <h2 className="text-lg font-semibold">Payment Successful ✅</h2>
          </div>
        )}
      </div>
    </div>
  )
}