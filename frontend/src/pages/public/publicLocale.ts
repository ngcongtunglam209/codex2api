// 公开站点（/ 与 /docs）自带的语言状态。
// 故意不接入 src/i18n.ts：管理台三种语言的巨型 locale 文件里没有越南语，
// 把 vi 注册进 i18next 会让整个后台在缺 key 时回落英文；公开站文案量大、
// 与后台完全不重叠，单独维护更安全。
import { useCallback, useEffect, useState } from 'react'

export type PublicLocale = 'vi' | 'en' | 'zh'

export const PUBLIC_LOCALES: PublicLocale[] = ['vi', 'en', 'zh']

export const PUBLIC_LOCALE_LABELS: Record<PublicLocale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
}

const STORAGE_KEY = 'public-lang'
const HTML_LANG: Record<PublicLocale, string> = { vi: 'vi', en: 'en', zh: 'zh-CN' }

function isPublicLocale(value: unknown): value is PublicLocale {
  return value === 'vi' || value === 'en' || value === 'zh'
}

export function detectPublicLocale(): PublicLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isPublicLocale(stored)) return stored
    // 后台语言开关（key: lang）已经表达过偏好时沿用，避免同一浏览器里两套语言打架。
    const adminLang = localStorage.getItem('lang')
    if (adminLang === 'en') return 'en'
    if (adminLang === 'zh' || adminLang === 'zh-TW') return 'zh'
  } catch {
    // localStorage 不可用（隐身模式 / 权限限制）时退回浏览器语言。
  }
  const browser = (navigator.language || 'en').toLowerCase()
  if (browser.startsWith('vi')) return 'vi'
  if (browser.startsWith('zh')) return 'zh'
  return 'en'
}

export function usePublicLocale() {
  const [locale, setLocaleState] = useState<PublicLocale>(detectPublicLocale)

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale]
  }, [locale])

  const setLocale = useCallback((next: PublicLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 写入失败只影响持久化，不影响当前会话。
    }
  }, [])

  const cycleLocale = useCallback(() => {
    setLocale(PUBLIC_LOCALES[(PUBLIC_LOCALES.indexOf(locale) + 1) % PUBLIC_LOCALES.length])
  }, [locale, setLocale])

  return { locale, setLocale, cycleLocale }
}
