// 公开价目表编辑器（/admin/settings 内）。对外售价由管理员手填，与 /admin/model-pricing
// 的上游成本价互不影响；这里保存的 JSON 直接落到 system_settings.public_pricing_config。
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Save, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

type PricingRow = {
  model: string
  input: number
  cached_input: number
  output: number
  badge?: string
  note?: string
}

type PricingConfig = {
  enabled: boolean
  usd_to_vnd: number
  note: { vi?: string; en?: string; zh?: string }
  rows: PricingRow[]
}

const EMPTY: PricingConfig = { enabled: false, usd_to_vnd: 0, note: {}, rows: [] }

function parseConfig(raw: string): PricingConfig {
  try {
    const parsed = JSON.parse(raw || '{}') as Partial<PricingConfig>
    return {
      enabled: Boolean(parsed.enabled),
      usd_to_vnd: Number(parsed.usd_to_vnd) || 0,
      note: parsed.note ?? {},
      rows: Array.isArray(parsed.rows)
        ? parsed.rows.map((row) => ({
            model: String(row?.model ?? ''),
            input: Number(row?.input) || 0,
            cached_input: Number(row?.cached_input) || 0,
            output: Number(row?.output) || 0,
            badge: row?.badge ? String(row.badge) : '',
            note: row?.note ? String(row.note) : '',
          }))
        : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

const NUMBER_CLASS = 'h-8 w-24 font-mono text-xs'

export default function PublicPricingEditor({
  value,
  onSaved,
}: {
  value: string
  onSaved: (next: string) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [config, setConfig] = useState<PricingConfig>(() => parseConfig(value))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const update = (patch: Partial<PricingConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setDirty(true)
  }

  const updateRow = (index: number, patch: Partial<PricingRow>) => {
    setConfig((current) => ({
      ...current,
      rows: current.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
    setDirty(true)
  }

  const rate = config.usd_to_vnd
  const preview = useMemo(() => {
    if (!rate || !config.rows.length) return ''
    const first = config.rows[0]
    return `${first.model || '—'}: $${first.output} → ${Math.round(first.output * rate).toLocaleString('vi-VN')} ₫`
  }, [config.rows, rate])

  const save = async () => {
    setSaving(true)
    try {
      const payload = JSON.stringify({
        enabled: config.enabled,
        usd_to_vnd: config.usd_to_vnd,
        note: config.note,
        rows: config.rows.filter((row) => row.model.trim() !== ''),
      })
      await api.updateSettings({ public_pricing_config: payload })
      onSaved(payload)
      setDirty(false)
      showToast(t('settings.publicPricingSaved'), 'success')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={config.enabled} onCheckedChange={(checked) => update({ enabled: checked })} />
          {t('settings.publicPricingEnabled')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('settings.publicPricingRate')}
          <Input
            className="h-8 w-32 font-mono text-xs"
            inputMode="decimal"
            value={config.usd_to_vnd || ''}
            placeholder="26000"
            onChange={(event) => update({ usd_to_vnd: Number(event.target.value) || 0 })}
          />
        </label>
        {preview ? <span className="text-xs text-muted-foreground">{preview}</span> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-2 font-medium">{t('settings.publicPricingModel')}</th>
              <th className="px-2 py-2 font-medium">Input</th>
              <th className="px-2 py-2 font-medium">Cached</th>
              <th className="px-2 py-2 font-medium">Output</th>
              <th className="px-2 py-2 font-medium">{t('settings.publicPricingBadge')}</th>
              <th className="px-2 py-2 font-medium">{t('settings.publicPricingNote')}</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, index) => (
              <tr key={index} className="border-t border-border/60">
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 w-44 font-mono text-xs"
                    value={row.model}
                    placeholder="gpt-5.5"
                    onChange={(event) => updateRow(index, { model: event.target.value })}
                  />
                </td>
                {(['input', 'cached_input', 'output'] as const).map((field) => (
                  <td key={field} className="px-2 py-1.5">
                    <Input
                      className={NUMBER_CLASS}
                      inputMode="decimal"
                      value={row[field] || ''}
                      placeholder="0"
                      onChange={(event) => updateRow(index, { [field]: Number(event.target.value) || 0 })}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 w-24 text-xs"
                    value={row.badge ?? ''}
                    onChange={(event) => updateRow(index, { badge: event.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 w-52 text-xs"
                    value={row.note ?? ''}
                    onChange={(event) => updateRow(index, { note: event.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setConfig((current) => ({
                        ...current,
                        rows: current.rows.filter((_, i) => i !== index),
                      }))
                      setDirty(true)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {config.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t('settings.publicPricingEmpty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(['vi', 'en', 'zh'] as const).map((locale) => (
          <label key={locale} className="space-y-1 text-xs">
            <span className="text-muted-foreground">
              {t('settings.publicPricingHowToPay')} · {locale}
            </span>
            <textarea
              className="min-h-20 w-full rounded-md border border-border/70 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-primary/50"
              value={config.note[locale] ?? ''}
              onChange={(event) => update({ note: { ...config.note, [locale]: event.target.value } })}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setConfig((current) => ({
              ...current,
              rows: [...current.rows, { model: '', input: 0, cached_input: 0, output: 0, badge: '', note: '' }],
            }))
            setDirty(true)
          }}
        >
          <Plus className="size-3.5" />
          {t('settings.publicPricingAddRow')}
        </Button>
        <Button size="sm" className="gap-1.5" disabled={saving || !dirty} onClick={save}>
          <Save className="size-3.5" />
          {t('settings.publicPricingSave')}
        </Button>
      </div>
    </div>
  )
}
