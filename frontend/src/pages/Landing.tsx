// 公开主页（/）。面向下游使用者：拿到 base URL、拿到示例、跳去文档。
// 不需要任何鉴权，也不展示池内敏感信息。
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Check, Copy, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useBranding } from '../branding'
import {
  PublicBackdrop,
  PublicCodeBlock,
  PublicFooter,
  PublicHeader,
  PublicSectionTitle,
  resolvePlaceholders,
  useCopyToClipboard,
  usePublicBaseUrls,
} from './public/PublicShell'
import { landing, landingSnippets, nav, pick } from './public/publicContent'
import { usePublicLocale } from './public/publicLocale'

type HealthState = { ok: boolean; available: number } | null

export default function Landing() {
  const { locale, cycleLocale } = usePublicLocale()
  const { base, api } = usePublicBaseUrls()
  const { siteName } = useBranding()
  const { copiedKey, copy } = useCopyToClipboard()
  const [health, setHealth] = useState<HealthState>(null)
  const [activeSnippet, setActiveSnippet] = useState(landingSnippets[0].id)

  useEffect(() => {
    document.title = `${siteName} · API`
  }, [siteName])

  useEffect(() => {
    let cancelled = false
    fetch('/health', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('health failed'))))
      .then((data: { available?: number }) => {
        if (!cancelled) setHealth({ ok: true, available: Number(data?.available ?? 0) })
      })
      .catch(() => {
        if (!cancelled) setHealth({ ok: false, available: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const snippet = landingSnippets.find((item) => item.id === activeSnippet) ?? landingSnippets[0]

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <PublicBackdrop />
      <PublicHeader locale={locale} onCycleLocale={cycleLocale} active="home" />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="py-14 sm:py-20">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              {pick(landing.eyebrow, locale)}
            </Badge>
            {health ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    health.ok && health.available > 0 ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                />
                {health.ok
                  ? `${pick(landing.statusOnline, locale)} · ${health.available} ${pick(landing.statusAccounts, locale)}`
                  : pick(landing.statusOffline, locale)}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl sm:leading-[1.1]">
            {pick(landing.title, locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {pick(landing.subtitle, locale)}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Button asChild size="lg" className="gap-2">
              <Link to="/docs">
                <BookOpen className="size-4" />
                {pick(landing.docsCta, locale)}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/key-usage">{pick(nav.usage, locale)}</a>
            </Button>
          </div>

          <Card className="mt-9 max-w-2xl border-border/70">
            <CardContent className="p-4 sm:p-5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {pick(landing.baseUrlLabel, locale)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border/70 bg-muted/40 px-3 py-2 font-mono text-sm">
                  {api}
                </code>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(api, 'base')}>
                  {copiedKey === 'base' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedKey === 'base' ? pick(landing.copied, locale) : pick(landing.copy, locale)}
                </Button>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                {pick(landing.baseUrlHint, locale)} <code className="font-mono">{base}</code>
              </p>
              <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                {pick(landing.keyNotice, locale)}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="border-t border-border/60 py-12 sm:py-16">
          <PublicSectionTitle>{pick(landing.featuresTitle, locale)}</PublicSectionTitle>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {landing.features.map((feature) => (
              <Card key={feature.title.en} className="border-border/70">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold tracking-tight">{pick(feature.title, locale)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {pick(feature.body, locale)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 py-12 sm:py-16">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground" />
            <PublicSectionTitle>{pick(landing.quickstartTitle, locale)}</PublicSectionTitle>
          </div>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {pick(landing.quickstartHint, locale)}
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {landingSnippets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSnippet(item.id)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  item.id === snippet.id
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/70 text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 max-w-3xl">
            <PublicCodeBlock
              locale={locale}
              label={snippet.label}
              copyKey={`snippet-${snippet.id}`}
              code={resolvePlaceholders(snippet.code, base, api)}
            />
          </div>
          <div className="mt-5">
            <Button asChild variant="ghost" className="gap-1.5 px-2">
              <Link to="/docs">
                {pick(landing.docsCta, locale)}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter note={pick(landing.footerNote, locale)} />
    </div>
  )
}
