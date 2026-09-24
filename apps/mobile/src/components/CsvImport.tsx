/**
 * Upload a bank CSV on the phone: pick the file from Files (iCloud Drive,
 * Downloads, a mail attachment saved there), then match its columns, with a
 * live preview, before anything is added. The same core helpers as the web
 * (parseCsv, guessMapping, guessAccountType, rowsToTransactions), so a file
 * imports the same way on both; the chosen mapping is remembered for next
 * time. Nothing leaves the phone.
 */
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { useStore, type AccountType, type ColumnMapping, type CsvRow, type ImportSource } from '@moneyquiz/core'
import { categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import { newId } from '@moneyquiz/core/lib/id'
import {
  guessAccountType,
  guessMapping,
  mappingFitsHeaders,
  parseCsv,
  rowsToTransactions,
} from '@moneyquiz/core/lib/importCsv'

import { Badge, Button, Card, CardTitle, Note, Segmented, StatusLine } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

interface Picked {
  fileName: string
  headers: string[]
  rows: CsvRow[]
}

export function CsvImport() {
  const { colors } = useAppTheme()
  const { sources, mapping: remembered, addImport, saveMapping } = useStore()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Read a file into the column-matching step (split from picking so the
  // two can fail with their own messages).
  const load = async (uri: string, fileName: string) => {
    try {
      const parsed = parseCsv(await new File(uri).text())
      if (!parsed.ok) {
        setError(parsed.error)
        return
      }
      setPicked({ fileName, headers: parsed.headers, rows: parsed.rows })
    } catch {
      setError('Could not read that file. Please try again.')
    }
  }

  const choose = async () => {
    setError(null)
    setNotice(null)
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Banks label CSVs every which way; plain text covers the stragglers.
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain'],
        copyToCacheDirectory: true,
      })
      if (res.canceled || !res.assets?.[0]) return
      await load(res.assets[0].uri, res.assets[0].name)
    } catch {
      setError('Could not open Files. Please try again.')
    }
  }

  const confirm = (m: ColumnMapping) => {
    if (!picked) return
    const sourceId = newId()
    const result = rowsToTransactions(picked.rows, m, { sourceId })
    const source: ImportSource = {
      id: sourceId,
      fileName: picked.fileName || 'Imported file',
      importedAt: new Date().toISOString(),
      accountType: m.accountType ?? 'bank',
      count: result.transactions.length,
      dropped: result.droppedPayments,
    }
    const duplicate = sources.some((s) => s.fileName === source.fileName)
    addImport(result.transactions, source)
    saveMapping(m)
    setPicked(null)
    setNotice(
      `Added ${result.transactions.length} transactions from ${source.fileName}` +
        (result.droppedPayments > 0
          ? ` (${result.droppedPayments} card payment${result.droppedPayments === 1 ? '' : 's'} removed)`
          : '') +
        (result.skipped > 0 ? ` · ${result.skipped} rows skipped` : '') +
        '.' +
        (duplicate ? ' Note: you already imported a file with this name.' : ''),
    )
  }

  if (picked) {
    return (
      <MatchColumns
        key={picked.fileName}
        picked={picked}
        remembered={remembered}
        onConfirm={confirm}
        onCancel={() => setPicked(null)}
      />
    )
  }

  return (
    <Card>
      <CardTitle>Upload a CSV</CardTitle>
      <Note>
        Most banks let you download your transactions as a CSV file. Save it to Files (or iCloud
        Drive), then pick it here. Each file adds to what&apos;s already here, and it never leaves
        your phone.
      </Note>
      <Button title="Choose a CSV file" onPress={() => void choose()} />
      {error && <StatusLine kind="error">{error}</StatusLine>}
      {notice && <StatusLine kind="success">{notice}</StatusLine>}
      {!notice && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>
          We&apos;ll ask which column is which, then show a preview before adding anything.
        </Text>
      )}
    </Card>
  )
}

function MatchColumns({
  picked,
  remembered,
  onConfirm,
  onCancel,
}: {
  picked: Picked
  remembered: ColumnMapping | null
  onConfirm: (m: ColumnMapping) => void
  onCancel: () => void
}) {
  const { colors } = useAppTheme()
  const { headers, rows } = picked
  const usedRemembered = !!remembered && mappingFitsHeaders(remembered, headers)
  const [m, setM] = useState<ColumnMapping>(() =>
    usedRemembered && remembered ? remembered : { ...guessMapping(headers), accountType: guessAccountType(headers, rows) },
  )
  const update = (patch: Partial<ColumnMapping>) => setM((prev) => ({ ...prev, ...patch }))

  const preview = useMemo(() => rowsToTransactions(rows.slice(0, 5), m), [rows, m])
  const full = useMemo(() => rowsToTransactions(rows, m), [rows, m])
  const accountType = m.accountType ?? 'bank'

  return (
    <Card>
      <CardTitle right={usedRemembered ? <Badge label="Using your saved mapping" /> : undefined}>
        Match your columns
      </CardTitle>
      <Note>
        {picked.fileName}: {rows.length} row{rows.length === 1 ? '' : 's'}. Tell us which column is which;
        we&apos;ll remember it for next time.
      </Note>

      <Label>What kind of account is this?</Label>
      <Segmented<AccountType>
        options={[
          { id: 'bank', label: 'Bank / checking' },
          { id: 'credit', label: 'Credit card' },
        ]}
        value={accountType}
        onChange={(v) => update({ accountType: v })}
      />
      {accountType === 'credit' && (
        <Note>Card payments will be removed: they&apos;re already counted as money leaving your checking account. Purchases and refunds are kept.</Note>
      )}

      <ColumnPicker label="Date column" headers={headers} value={m.date} onChange={(v) => update({ date: v ?? '' })} />
      <ColumnPicker
        label="Description / merchant column"
        headers={headers}
        value={m.description}
        onChange={(v) => update({ description: v ?? '' })}
      />

      <Label>How are amounts shown?</Label>
      <Segmented<ColumnMapping['amountMode']>
        options={[
          { id: 'single', label: 'One amount column' },
          { id: 'debitCredit', label: 'Debit & credit' },
        ]}
        value={m.amountMode}
        onChange={(v) => update({ amountMode: v })}
      />
      {m.amountMode === 'single' ? (
        <>
          <ColumnPicker label="Amount column" headers={headers} value={m.amount} onChange={(v) => update({ amount: v })} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.text }}>
              Positive numbers are expenses (flip the sign)
            </Text>
            <Switch
              value={m.invertAmount ?? false}
              onValueChange={(v) => update({ invertAmount: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Positive numbers are expenses"
            />
          </View>
        </>
      ) : (
        <>
          <ColumnPicker label="Debit (money out) column" headers={headers} value={m.debit} onChange={(v) => update({ debit: v })} />
          <ColumnPicker label="Credit (money in) column" headers={headers} value={m.credit} onChange={(v) => update({ credit: v })} />
        </>
      )}
      <ColumnPicker
        label="Category column (optional)"
        headers={headers}
        value={m.category}
        onChange={(v) => update({ category: v })}
        optional
      />

      {/* Preview */}
      <View style={{ gap: 2, borderRadius: radii.md, padding: spacing.sm + 2, backgroundColor: colors.background }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text }}>
          Preview · {full.transactions.length} ready
          {full.droppedPayments > 0 ? ` · ${full.droppedPayments} card payment${full.droppedPayments === 1 ? '' : 's'} removed` : ''}
          {full.skipped > 0 ? ` · ${full.skipped} skipped` : ''}
        </Text>
        {preview.transactions.length === 0 ? (
          <Note>No rows could be read with these columns yet. Check the date, description and amount above.</Note>
        ) : (
          preview.transactions.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 }}>
              <Text style={{ fontSize: 13 }}>{categoryMeta(t.category).emoji}</Text>
              <Text style={{ width: 88, fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>{formatDate(t.date)}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.ink }}>
                {t.description}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  fontVariant: ['tabular-nums'],
                  color: t.amount > 0 ? colors.success : colors.text,
                }}
              >
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Button
        title={`Import ${full.transactions.length} transaction${full.transactions.length === 1 ? '' : 's'}`}
        onPress={() => onConfirm(m)}
        disabled={full.transactions.length === 0}
      />
      <Button title="Cancel" variant="outline" onPress={onCancel} />
    </Card>
  )
}

function Label({ children }: { children: string }) {
  const { colors } = useAppTheme()
  return (
    <Text
      style={{
        marginTop: spacing.xs,
        fontFamily: fonts.sansMedium,
        fontSize: 11,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: colors.faint,
      }}
    >
      {children}
    </Text>
  )
}

/** A column choice as a row of chips, one per header in the file. */
function ColumnPicker({
  label,
  headers,
  value,
  onChange,
  optional,
}: {
  label: string
  headers: string[]
  value: string | undefined
  onChange: (v: string | undefined) => void
  optional?: boolean
}) {
  const { colors } = useAppTheme()
  const options: { id: string | undefined; label: string }[] = [
    ...(optional ? [{ id: undefined, label: 'None' }] : []),
    ...headers.map((h) => ({ id: h, label: h })),
  ]
  return (
    <View style={{ gap: spacing.xs }}>
      <Label>{label}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs + 2 }}>
        {options.map((o) => {
          const on = (value || undefined) === o.id
          return (
            <Pressable
              key={o.id ?? '__none'}
              onPress={() => onChange(o.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                minHeight: 34,
                justifyContent: 'center',
                paddingHorizontal: spacing.sm + 4,
                borderRadius: radii.pill,
                borderWidth: on ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.borderStrong,
                backgroundColor: on ? colors.primary : 'transparent',
              }}
            >
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: on ? colors.card : colors.text }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
