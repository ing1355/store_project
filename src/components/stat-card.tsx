import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon?: ReactNode
  sub?: string
  delta?: number | null // percentage change vs previous period
}

export function StatCard({ label, value, icon, sub, delta }: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined && isFinite(delta)
  const up = (delta ?? 0) >= 0
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon ? (
            <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
          ) : null}
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums text-balance">
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {hasDelta ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                up ? 'text-chart-2' : 'text-destructive',
              )}
            >
              {up ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {up ? '+' : ''}
              {delta!.toFixed(1)}%
            </span>
          ) : null}
          {sub ? (
            <span className="text-xs text-muted-foreground">{sub}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
