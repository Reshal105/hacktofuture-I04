'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/auth-context'
import { apiFetch } from '@/lib/api'
import { Header } from '@/components/header'
import { ThemeToggle } from '@/components/theme-toggle'
import { Laptop, Moon, Sun } from 'lucide-react'

const themeOptions = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your operating system preference',
    icon: Laptop,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Bright and clean display mode',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-light display mode',
    icon: Moon,
  },
]

export default function SettingsPage() {
  const { user, isLoading, updateDailyLimit } = useAuth()
  const router = useRouter()
  const [dailyLimit, setDailyLimit] = useState<number>(50)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
    if (user) {
      setDailyLimit(user.dailyLimit)
    }
  }, [user, isLoading, router])

  const handleSaveSettings = async () => {
    if (!user) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Save to backend
      await apiFetch('/api/users/update', {
        method: 'PUT',
        body: JSON.stringify({
          user_id: user.id,
          daily_limit: dailyLimit,
        }),
      })

      // Update local state
      updateDailyLimit(dailyLimit)
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null
  }

  const currentTheme = theme === 'system' ? 'system' : resolvedTheme === 'dark' ? 'dark' : 'light'

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your energy monitoring preferences</p>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Energy Limits</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Daily Usage Limit (kWh)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-24 px-4 py-2 rounded-lg border border-border bg-input text-foreground text-center font-semibold">
                  {dailyLimit} kWh
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You will receive an alert when daily consumption exceeds this limit.
              </p>
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-foreground mb-2">Alert Threshold</label>
              <select className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option>90% of limit (Warning)</option>
                <option>100% of limit (Critical)</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
              <p className="text-muted-foreground mt-1">Choose your preferred theme and keep the interface consistent.</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isActive = currentTheme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                    isActive ? 'border-primary bg-primary/10' : 'border-border bg-input'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notifications</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-foreground">High consumption alerts</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-foreground">Payment reminders</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-foreground">System status updates</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          {saveSuccess && (
            <div className="flex-1 py-2 px-4 bg-green-500/20 text-green-700 font-semibold rounded-lg border border-green-500/40">
              ✓ Settings saved successfully!
            </div>
          )}
          {saveError && (
            <div className="flex-1 py-2 px-4 bg-red-500/20 text-red-700 font-semibold rounded-lg border border-red-500/40">
              ✗ {saveError}
            </div>
          )}
          {!saveSuccess && !saveError && (
            <>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex-1 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
