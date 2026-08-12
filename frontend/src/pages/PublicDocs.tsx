// 公开文档站（/docs）。内容全部来自 public/publicContent.ts，无需鉴权。
import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBranding } from '../branding'
import {
  PublicBackdrop,
  PublicCodeBlock,
  PublicFooter,
  PublicHeader,
  resolvePlaceholders,
  usePublicBaseUrls,
} from './public/PublicShell'
import { docsMeta, docsSections, landing, pick, type DocsBlock } from './public/publicContent'
import { usePublicLocale, type PublicLocale } from './public/publicLocale'

export default function PublicDocs() {
  const { locale, cycleLocale } = usePublicLocale()
  const { base, api } = usePublicBaseUrls()
  const { siteName } = useBranding()
  const [activeId, setActiveId] = useState(docsSections[0].id)

  useEffect(() => {
    document.title = `${pick(docsMeta.title, locale)} · ${siteName}`
  }, [locale, siteName])

  // 滚动高亮：取当前视口内最靠上的小节。
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target.id) setActiveId(visible.target.id)
      },
      { rootMargin: '-72px 0px -60% 0px', threshold: [0, 1] },
    )
    docsSections.forEach((section) => {
      const node = document.getElementById(section.id)
      if (node) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [])

  const text = (value: string) => resolvePlaceholders(value, base, api)

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <PublicBackdrop />
      <PublicHeader locale={locale} onCycleLocale={cycleLocale} active="docs" />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5 px-2 text-xs">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              {pick(docsMeta.backHome, locale)}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pick(docsMeta.title, locale)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pick(docsMeta.subtitle, locale)}</p>
          <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {pick(landing.baseUrlLabel, locale)}
            </div>
            <code className="mt-1 block break-all font-mono text-sm">{api}</code>
          </div>
        </div>

        <div className="mt-10 gap-10 lg:flex">
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {pick(docsMeta.tocTitle, locale)}
              </div>
              <nav className="mt-3 flex flex-col gap-0.5">
                {docsSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={cn(
                      'rounded-md px-2 py-1.5 text-[13px] transition-colors',
                      section.id === activeId
                        ? 'bg-muted/70 font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pick(section.title, locale)}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-14">
            {docsSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <h2 className="text-xl font-semibold tracking-tight">{pick(section.title, locale)}</h2>
                {section.intro ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {text(pick(section.intro, locale))}
                  </p>
                ) : null}
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, index) => (
                    <BlockView
                      key={`${section.id}-${index}`}
                      block={block}
                      locale={locale}
                      blockKey={`${section.id}-${index}`}
                      render={text}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter note={pick(landing.footerNote, locale)} />
    </div>
  )
}

function BlockView({
  block,
  locale,
  blockKey,
  render,
}: {
  block: DocsBlock
  locale: PublicLocale
  blockKey: string
  render: (value: string) => string
}) {
  switch (block.kind) {
    case 'p':
      return <p className="text-sm leading-relaxed text-muted-foreground">{render(pick(block.text, locale))}</p>
    case 'list':
      return (
        <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 break-words">{render(pick(item, locale))}</span>
            </li>
          ))}
        </ol>
      )
    case 'note':
      return <Callout tone={block.tone}>{render(pick(block.text, locale))}</Callout>
    case 'code':
      return <PublicCodeBlock locale={locale} label={block.label} copyKey={blockKey} code={render(block.code)} />
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-muted/40">
              <tr>
                {block.head.map((head, index) => (
                  <th key={index} className="px-3 py-2 font-medium">
                    {pick(head, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border/60 align-top">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        'px-3 py-2',
                        cellIndex === 0 ? 'whitespace-nowrap font-mono text-[12.5px]' : 'text-muted-foreground',
                      )}
                    >
                      {render(pick(cell, locale))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function Callout({ tone, children }: { tone: 'info' | 'warn'; children: ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed',
        tone === 'warn'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
          : 'border-primary/25 bg-primary/5 text-foreground',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-primary')}
      />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}
