'use client'

import { TrendingUp, Cloud, AlertTriangle } from 'lucide-react'
import { UsageForecast, WeatherPrediction } from '@/hooks/use-forecasts'

interface ForecastSectionProps {
  usageForecast: UsageForecast | null
  weatherForecast: WeatherPrediction[]
  isLoading: boolean
}

export function ForecastSection({ usageForecast, weatherForecast, isLoading }: ForecastSectionProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-border/30 rounded w-40"></div>
          <div className="h-4 bg-border/30 rounded"></div>
          <div className="h-4 bg-border/30 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* AI Usage Forecast */}
      {usageForecast && (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <TrendingUp size={18} /> AI Usage Forecast
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-background/80 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Next 24h prediction</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{usageForecast.next_24h_units} kWh</p>
              <p className="text-xs text-muted-foreground mt-1">Est. ₹{usageForecast.next_24h_cost}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trend</p>
                <p className="mt-1 font-semibold text-foreground capitalize">{usageForecast.trend}</p>
              </div>
              <div className="rounded-lg bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk</p>
                <p className={`mt-1 font-semibold capitalize ${
                  usageForecast.risk_level === 'high' ? 'text-red-500' :
                  usageForecast.risk_level === 'medium' ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {usageForecast.risk_level}
                </p>
              </div>
              <div className="rounded-lg bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Peak</p>
                <p className="mt-1 font-semibold text-foreground">{usageForecast.peak_power}W</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-background/50 p-3">
              <p className="text-xs text-foreground leading-relaxed">{usageForecast.suggestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weather-Based Prediction */}
      {weatherForecast.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <Cloud size={18} /> Weather Impact Forecast
          </div>

          <div className="space-y-2">
            {weatherForecast.slice(0, 3).map((forecast) => (
              <div key={forecast.day} className="rounded-lg bg-background/80 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{forecast.day}</p>
                    <p className="text-xs text-muted-foreground capitalize">{forecast.condition}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      forecast.consumption_level === 'High' ? 'text-red-500' :
                      forecast.consumption_level === 'Medium' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {forecast.predicted_kwh} kWh
                    </p>
                    <p className="text-[11px] text-muted-foreground">{forecast.high_temp}°C</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{forecast.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
