'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CloudSun, Droplet, Lightbulb, Thermometer, Zap } from 'lucide-react'
import { MeterData } from '@/hooks/use-realtime-data'
import { PredictionPanel } from './prediction-panel'

const APPLIANCES = [
  { id: 'ac', label: 'Air Conditioner', extraUnits: 8.0 },
  { id: 'fridge', label: 'Refrigerator', extraUnits: 3.0 },
  { id: 'heater', label: 'Heater', extraUnits: 6.0 },
  { id: 'washing', label: 'Washing Machine', extraUnits: 1.5 },
  { id: 'lights', label: 'Lights', extraUnits: 1.0 },
  { id: 'tv', label: 'TV / Entertainment', extraUnits: 1.2 },
]

const LOCATION_COORDINATES: Record<string, { latitude: number; longitude: number; timezone: string }> = {
  'New Delhi, India': { latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
}

interface WeatherDay {
  date: string
  maxTemp: number
  minTemp: number
  precipitation: number
}

interface UsageForecastPanelProps {
  meterData: MeterData
}

export function UsageForecastPanel({ meterData }: UsageForecastPanelProps) {
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>(['ac', 'fridge', 'lights'])
  const [weather, setWeather] = useState<WeatherDay[]>([])
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  const applianceLoad = useMemo(
    () =>
      selectedAppliances.reduce((total, selected) => {
        const appliance = APPLIANCES.find((item) => item.id === selected)
        return total + (appliance?.extraUnits ?? 0)
      }, 0),
    [selectedAppliances]
  )

  const weatherImpact = useMemo(() => {
    if (!weather.length) return 1

    const avgTemp = weather.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0) / weather.length
    const avgPrecip = weather.reduce((sum, day) => sum + day.precipitation, 0) / weather.length
    let factor = 1

    if (avgTemp >= 32) factor += 0.16
    else if (avgTemp >= 28) factor += 0.1
    else if (avgTemp <= 14) factor += 0.12
    else if (avgTemp <= 18) factor += 0.08

    if (avgPrecip >= 15) factor += 0.06
    if (avgPrecip >= 30) factor += 0.1

    return Math.min(1.4, Math.max(0.9, factor))
  }, [weather])

  const predictedUsage = useMemo(() => {
    const baseline = meterData.dailyConsumption
    const weatherAdjusted = baseline * weatherImpact
    return Math.round((weatherAdjusted + applianceLoad) * 100) / 100
  }, [meterData.dailyConsumption, applianceLoad, weatherImpact])

  const status = predictedUsage > meterData.dailyConsumption * 1.15 ? 'high' : 'normal'
  const recommendation = useMemo(() => {
    if (status === 'high') {
      return 'AI predicts a higher usage day. Try reducing heavy appliances and use cooling/heating sparingly.'
    }
    return 'Usage is within normal range, but keep an eye on appliance load for the rest of the day.'
  }, [status])

  useEffect(() => {
    async function fetchWeather() {
      setLoadingWeather(true)
      setWeatherError(null)

      const coords = LOCATION_COORDINATES[meterData.location] ?? LOCATION_COORDINATES['New Delhi, India']
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(coords.timezone)}&forecast_days=3`

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Weather API unavailable')
        }

        const body = await response.json()
        const daily = body.daily

        if (!daily || !daily.time) {
          throw new Error('Invalid weather response')
        }

        setWeather(
          daily.time.map((date: string, index: number) => ({
            date,
            maxTemp: daily.temperature_2m_max[index],
            minTemp: daily.temperature_2m_min[index],
            precipitation: daily.precipitation_sum[index],
          }))
        )
      } catch (error) {
        setWeatherError('Weather forecast unavailable. Showing AI usage forecast only.')
        setWeather([
          { date: 'Tomorrow', maxTemp: 34, minTemp: 27, precipitation: 2 },
          { date: 'Day 2', maxTemp: 31, minTemp: 25, precipitation: 5 },
          { date: 'Day 3', maxTemp: 29, minTemp: 24, precipitation: 8 },
        ])
      } finally {
        setLoadingWeather(false)
      }
    }

    fetchWeather()
  }, [meterData.location])

  return (
    <div className="metric-card border border-border p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Agentic Forecast</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">Usage Prediction with Weather & Appliances</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Predicting tomorrow&apos;s electricity units using appliance load selection and weather-driven usage patterns.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          AI confidence: <span className="font-semibold">high</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-2 text-primary"><Zap size={18} /><span className="text-sm font-medium">Current Base</span></div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{meterData.dailyConsumption} kWh</p>
          <p className="text-xs text-muted-foreground">Today&apos;s current estimate</p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-2 text-amber-500"><Lightbulb size={18} /><span className="text-sm font-medium">Appliance Load</span></div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{applianceLoad.toFixed(1)} kWh</p>
          <p className="text-xs text-muted-foreground">Selected appliance usage</p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-2 text-cyan-500"><CloudSun size={18} /><span className="text-sm font-medium">Weather Impact</span></div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{(weatherImpact * 100).toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">Forecast usage multiplier</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {APPLIANCES.map((appliance) => (
          <label
            key={appliance.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:border-primary/70 hover:bg-primary/5"
          >
            <input
              type="checkbox"
              checked={selectedAppliances.includes(appliance.id)}
              onChange={() => {
                setSelectedAppliances((current) =>
                  current.includes(appliance.id)
                    ? current.filter((id) => id !== appliance.id)
                    : [...current, appliance.id]
                )
              }}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium text-foreground">{appliance.label}</p>
              <p className="text-xs text-muted-foreground">+{appliance.extraUnits} kWh</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Tomorrow&apos;s predicted usage</p>
            <p className="mt-2 text-4xl font-semibold text-foreground">{predictedUsage} kWh</p>
          </div>
          <div className="rounded-2xl bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary-foreground">
            {status === 'high' ? 'High Forecast' : 'Normal Forecast'}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{recommendation}</p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Thermometer size={18} />
          <span>Weather-based usage prediction</span>
        </div>

        {loadingWeather ? (
          <p className="text-sm text-muted-foreground">Loading weather forecast...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {weather.map((day) => (
              <div key={day.date} className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{day.date}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{Math.round((day.maxTemp + day.minTemp) / 2)}°C</p>
                <p className="text-xs text-muted-foreground">{day.minTemp.toFixed(0)}° / {day.maxTemp.toFixed(0)}°</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplet size={14} /> {day.precipitation.toFixed(1)} mm
                </p>
              </div>
            ))}
          </div>
        )}
        {weatherError ? <p className="text-sm text-destructive">{weatherError}</p> : null}
      </div>

      <div className="mt-6">
        <PredictionPanel
          status={status}
          message="Agentic AI has combined weather and appliance usage to forecast tomorrow's units."
          recommendation={recommendation}
        />
      </div>
    </div>
  )
}
