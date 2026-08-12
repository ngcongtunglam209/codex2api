// 公开站点共享外壳：头部、底部、代码块。
// 只依赖公开接口（/api/branding、/health），不触碰任何 admin API。
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, Languages, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DEFAULT_SITE_LOGO, useBranding } from '../../branding'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '@/lib/utils'
import { nav, pick, type Copy as CopyText } from './publicContent'
import { PUBLIC_LOCALE_LABELS, type PublicLocale } from './publicLocale'

export function usePublicBaseUrls() {
  return useMemo(() => {
    const base = typeof window === 'undefined' ? '' : window.location.origin
    return { base, api: `${base}/v1` }
  }, [])
}

// 把文案 / 代码里的 {BASE}、{API} 占位符换成当前站点地址。
export function resolvePlaceholders(text: string, base: string, api: string): string {
  return text.split('{API}').join(api).split('{BASE}').join(base)
}

export function useCopyToClipboard(resetMs = 1600) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = useCallback(
    async (value: string, key: string) => {
      try {
        await navigator.clipboard.writeText(value)
      } catch {
        // 非 HTTPS 或权限被拒时静默失败——用户仍可手动选中复制。
        return
      }
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), resetMs)
    },
    [resetMs],
  )
  return { copiedKey, copy }
}

export function PublicCodeBlock({
  code,
  label,
  copyKey,
  locale,
}: {
  code: string
  label?: string
  copyKey: string
  locale: PublicLocale
}) {
  const { copiedKey, copy } = useCopyToClipboard()
  const copied = copiedKey === copyKey
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{label ?? ''}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-[11px]"
          onClick={() => copy(code, copyKey)}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {locale === 'vi' ? (copied ? 'Đã chép' : 'Chép') : copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-[12.5px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}

export function PublicToolbar({
  locale,
  onCycleLocale,
}: {
  locale: PublicLocale
  onCycleLocale: () => void
}) {
  const { theme, toggle } = useTheme()
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onCycleLocale}>
        <Languages className="size-4" />
        <span className="hidden sm:inline">{PUBLIC_LOCALE_LABELS[locale]}</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={toggle} aria-label="theme">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  )
}

export function PublicHeader({
  locale,
  onCycleLocale,
  active,
}: {
  locale: PublicLocale
  onCycleLocale: () => void
  active: 'home' | 'docs'
}) {
  const { siteName, siteLogo } = useBranding()
  const logoSrc = siteLogo || DEFAULT_SITE_LOGO
  const linkClass = (isActive: boolean) =>
    cn(
      'rounded-md px-2.5 py-1.5 text-sm transition-colors',
      isActive ? 'bg-muted/70 font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
    )
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-card/75 backdrop-blur-xl supports-[backdrop-filter]:bg-card/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={logoSrc} alt={siteName} className="size-8 rounded-lg object-cover ring-1 ring-border/60" />
          <span className="truncate text-sm font-semibold tracking-tight">{siteName}</span>
        </Link>
        <nav className="ml-2 flex flex-1 items-center gap-0.5">
          <Link to="/" className={linkClass(active === 'home')}>
            {pick(nav.getStarted, locale)}
          </Link>
          <Link to="/docs" className={linkClass(active === 'docs')}>
            {pick(nav.docs, locale)}
          </Link>
          <a href="/key-usage" className={linkClass(false)}>
            {pick(nav.usage, locale)}
          </a>
        </nav>
        <PublicToolbar locale={locale} onCycleLocale={onCycleLocale} />
        <a
          href="/admin/"
          className="hidden rounded-md border border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          {pick(nav.admin, locale)}
        </a>
      </div>
    </header>
  )
}

export function PublicFooter({ note }: { note: string }) {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto max-w-6xl px-4 text-xs leading-relaxed text-muted-foreground sm:px-6">{note}</div>
    </footer>
  )
}

export function PublicBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 [background:radial-gradient(ellipse_70%_50%_at_15%_-10%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_55%),radial-gradient(ellipse_55%_45%_at_90%_0%,color-mix(in_oklab,var(--color-primary)_8%,transparent),transparent_50%),linear-gradient(180deg,color-mix(in_oklab,var(--color-muted)_55%,var(--color-background)),var(--color-background)_42%)]"
    />
  )
}

export function PublicSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{children}</h2>
}

export function localized(copy: CopyText, locale: PublicLocale, base: string, api: string): string {
  return resolvePlaceholders(pick(copy, locale), base, api)
}
