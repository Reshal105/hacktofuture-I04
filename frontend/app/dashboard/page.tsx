'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useRealtimeData } from '@/hooks/use-realtime-data'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { PowerChart } from '@/components/power-chart'
import { EnergyAnalytics } from '@/components/energy-analytics'
import { AlertsSection } from '@/components/alerts-section'
import { InsightsMentorCard } from '@/components/AIInsightsCard'
import { BillingSection } from '@/components/billing-section'
import { PaymentPanel } from '@/components/payment-panel'
import { ChatWidget } from '@/components/chat-widget'
import { Zap, Waves, Lightbulb, Activity } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const meterId = user?.meterId ?? 'Unknown'
  const {
    meterData,
    alerts,
    insights,
    notifications,
    backendConnected,
    isLoading: dataLoading,
  } = useRealtimeData(meterId)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary mb-4" />
          <p className="text-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const chartData = meterData.history.map((reading) => {
    const date = new Date(reading.timestamp)
    return {
      hour: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      usage: Math.round(reading.power * 10) / 10,
    }
  })

  const status = insights?.status ?? (meterData.peakUsage > 40 ? 'high' : 'normal')
  const message = insights?.message ?? (meterData.peakUsage > 40 ? 'High Usage Detected' : 'Normal Operations')
  const recommendation =
    insights?.recommendation ??
    (meterData.peakUsage > 40
      ? 'Consider reducing load or checking connected devices.'
      : 'All systems operating normally.')

  const dynamicNotifications =
    notifications.length > 0
      ? notifications
      : [
          meterData.current.power > 1800
            ? 'High usage detected, consider reducing AC usage.'
            : 'Usage is stable today.',
          meterData.dailyConsumption > user.dailyLimit
            ? 'Daily consumption is above your target limit.'
            : 'Daily consumption remains within the planned range.',
        ]

  return (
    <div className="min-h-screen bg-background">
      <Header notificationCount={dynamicNotifications.length + alerts.length} notifications={dynamicNotifications} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {!backendConnected && (
          <div className="mb-6 rounded-3xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            The backend is currently unavailable. Showing fallback preview data where possible.
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Welcome back, {user.name}. Your meter is currently tracking live power usage.
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:items-center">
            <div className="rounded-3xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Meter ID: {meterId}
            </div>
            <div className="rounded-3xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Location: {user.location}
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Live Metrics</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              type="voltage"
              label="Voltage"
              value={meterData.current.voltage}
              unit="V"
              icon={<Zap size={20} />}
              trend={Math.round(meterData.current.voltage - 230)}
              trendLabel="Live"
            />
            <MetricCard
              type="current"
              label="Current"
              value={meterData.current.current}
              unit="A"
              icon={<Waves size={20} />}
              trend={Math.round(meterData.current.current - 5)}
              trendLabel="Live"
            />
            <MetricCard
              type="power"
              label="Power"
              value={meterData.current.power}
              unit="W"
              icon={<Lightbulb size={20} />}
              trend={Math.round(meterData.current.power - meterData.averageUsage)}
              trendLabel="vs avg"
            />
            <MetricCard
              type="energy"
              label="Today's Energy"
              value={meterData.dailyConsumption}
              unit="kWh"
              icon={<Activity size={20} />}
              trend={Math.round((meterData.dailyConsumption / (user.dailyLimit || 1)) * 100)}
              trendLabel={`${Math.round((meterData.dailyConsumption / (user.dailyLimit || 1)) * 100)}% of limit`}
            />
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <PowerChart data={meterData.history} />
          <EnergyAnalytics data={chartData} />
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <InsightsMentorCard
            insight={insights}
            dailyLimit={user.dailyLimit}
            currentUsage={meterData.current.power}
            averageUsage={meterData.averageUsage}
            dailyConsumption={meterData.dailyConsumption}
          />
          <PaymentPanel amount={meterData.dailyConsumption * 8.5} meterId={meterId} />
        </section>

        <section className="mb-8">
          <AlertsSection alerts={alerts} />
        </section>
      </main>

      <ChatWidget currentUsage={meterData.current.power} dailyConsumption={meterData.dailyConsumption} />
    </div>
  )
}
