'use client'

import { Bell, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface HeaderProps {
  notificationCount?: number
  notifications?: string[]
}

export function Header({ notificationCount = 2, notifications = [] }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-backdrop-filter:bg-card/50 sticky top-0 z-40 transition-all duration-200">
      <div className="flex h-16 items-center justify-between px-6 gap-6">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Smart Grid</h1>
          <p className="text-xs font-medium text-muted-foreground">Real-Time Monitoring & Billing</p>
        </div>

        <div className="hidden md:flex flex-col text-right text-sm">
          <p className="text-foreground font-semibold">{user?.name || 'Guest'}</p>
          <p className="text-muted-foreground text-xs">{user?.location || 'Location'}</p>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative p-2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card/50"
                title="Notifications"
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold">
                    {notificationCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notifications</p>
                    <h3 className="text-sm font-semibold text-foreground mt-1">Recent updates</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    {notificationCount} new
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card/50 p-3 text-sm text-muted-foreground">
                      No new notifications right now.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notification, index) => (
                      <div key={index} className="rounded-2xl border border-border bg-background/80 p-3 text-sm text-foreground">
                        {notification}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Link
            href="/settings"
            className="p-2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-border/50 rounded-lg inline-flex focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card/50"
            title="Settings"
          >
            <Settings size={20} />
          </Link>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-border/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card/50"
                title="Profile details"
              >
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-80">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</p>
                  <h3 className="text-sm font-semibold text-foreground mt-1">{user?.name || 'User'}</h3>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm font-semibold text-foreground wrap-break-word">{user?.email}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Meter ID</p>
                      <p className="text-sm font-semibold text-foreground mt-1 truncate">{user?.meterId}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Location</p>
                      <p className="text-sm font-semibold text-foreground mt-1 truncate">{user?.location}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Link
                    href="/settings"
                    className="inline-flex justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-border/50 transition-colors"
                  >
                    Account settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex justify-center rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive transition-all duration-200 hover:bg-destructive/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-card/50"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
