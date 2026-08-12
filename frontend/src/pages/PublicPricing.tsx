// 公开价目页（/pricing）。数据来自公开接口 /api/pricing，管理员在 /admin/settings 维护。
import { useEffect } from 'react'
import { ArrowRight, BookOpen, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useBranding } from '../branding'
import {
  PublicBackdrop,
  PublicFooter,
  PublicHeader,
  usePublicBaseUrls,
  usePublicPricing,
} from './public/PublicShell'
import { landing, nav, pick, pricing } from './public/publicContent'
import { usePublicLocale, type PublicLocale } from './public/publicLocale'

// USD 单价按 1M token 报价，小于 1 时保留 4 位小数（0.0125 这种档位要看得见）。
function formatUSD(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return `$${value.toFixed(value < 1 ? 4 : 2).replace(/\.?0+$/, '')}`
}

function formatVND(usd: number, rate: number, locale: PublicLocale): string {
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(rate) || rate <= 0) return '—'
  const value = Math.round(usd * rate)
  return `${value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ₫`
}

export default function PublicPricing() {
  const { locale, cycleLocale } = usePublicLocale()
  const { api } = usePublicBaseUrls()
  const { siteName } = useBranding()
  const { loading, config } = usePublicPricing()

  useEffect(() => {
    document.title = `${pick(pricing.title, locale)} · ${siteName}`
  }, [locale, siteName])

  const rate = config?.usd_to_vnd ?? 0
  const showVND = rate > 0
  const operatorNote = config?.note?.[locale] || config?.note?.en || ''

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <PublicBackdrop />
      <PublicHeader locale={locale} onCycleLocale={cycleLocale} active="pricing" />

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pick(pricing.title, locale)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {pick(pricing.subtitle, locale)}
        </p>

        {loading ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl border border-border/70 bg-muted/30" />
        ) : !config ? (
          <Card className="mt-8 border-border/70">
            <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
              {pick(pricing.empty, locale)}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-8 overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">{pick(pricing.model, locale)}</th>
                    <th className="px-3 py-2.5 font-medium">{pick(pricing.input, locale)}</th>
                    <th className="px-3 py-2.5 font-medium">{pick(pricing.cachedInput, locale)}</th>
                    <th className="px-3 py-2.5 font-medium">{pick(pricing.output, locale)}</th>
                    <th className="px-3 py-2.5 font-medium">{pick(pricing.note, locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {config.rows.map((row) => (
                    <tr key={row.model} className="border-t border-border/60 align-top">
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <code className="font-mono text-[12.5px]">{row.model}</code>
                          {row.badge ? (
                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                              {row.badge}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      {[row.input, row.cached_input, row.output].map((value, index) => (
                        <td key={index} className="whitespace-nowrap px-3 py-3">
                          <div className="font-medium">{formatUSD(value)}</div>
                          {showVND ? (
                            <div className="text-[11px] text-muted-foreground">{formatVND(value, rate, locale)}</div>
                          ) : null}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-muted-foreground">{row.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {pick(pricing.unit, locale)}
              {showVND ? ` · ${pick(pricing.vndHint, locale).replace('{RATE}', rate.toLocaleString('vi-VN'))}` : ''}
            </p>

            <div className={cn('mt-6 grid gap-3', operatorNote ? 'sm:grid-cols-2' : '')}>
              <Card className="border-border/70">
                <CardContent className="flex gap-2.5 p-4 text-[13px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{pick(pricing.cachedHint, locale)}</span>
                </CardContent>
              </Card>
              {operatorNote ? (
                <Card className="border-border/70">
                  <CardContent className="p-4 text-[13px] leading-relaxed">
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {pick(pricing.howToPay, locale)}
                    </div>
                    <p className="whitespace-pre-line text-muted-foreground">{operatorNote}</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </>
        )}

        <div className="mt-9 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {pick(landing.baseUrlLabel, locale)}
          </div>
          <code className="mt-1 block break-all font-mono text-sm">{api}</code>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button asChild className="gap-2">
            <Link to="/docs">
              <BookOpen className="size-4" />
              {pick(pricing.ctaDocs, locale)}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/key-usage">{pick(nav.usage, locale)}</a>
          </Button>
        </div>
      </main>

      <PublicFooter note={pick(landing.footerNote, locale)} />
    </div>
  )
}
