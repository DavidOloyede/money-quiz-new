/**
 * Edit one charge on the phone: star it as recurring, rename it, or change
 * its category. Same rules as the web, through the same store actions: the
 * edit pins to THIS row only, then we offer the related charges (same amount
 * first, then the whole merchant), which you can review and untick before
 * applying. Treatments, links, bulk edits and category rules stay on the web.
 */
import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStore, type Category, type Transaction } from '@moneyquiz/core'
import { allCategories, categoryLabel, categoryMeta } from '@moneyquiz/core/lib/categories'
import { formatAbs, formatCurrency, formatDate } from '@moneyquiz/core/lib/format'
import {
  categoryCandidates,
  displayDescription,
  groupLabel,
  merchantKey,
  renameCandidates,
} from '@moneyquiz/core/lib/merchant'

import { MerchantLogo, brandForRow } from '@/components/MerchantLogo'
import { Button } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

export function useTransactionEditor() {
  const [id, setId] = useState<string | null>(null)
  return {
    open: (t: Transaction) => setId(t.id),
    node: id ? <TransactionSheet id={id} onClose={() => setId(null)} /> : null,
  }
}

interface Option {
  /** Completes "Also rename …" / "Also file …", e.g. "the 3 $9.99 charges". */
  label: string
  rows: Transaction[]
  /** The whole-merchant sweep (a category sweep left intact is remembered per merchant). */
  wholeMerchant: boolean
}

type Offer =
  | { kind: 'rename'; name: string; options: Option[] }
  | { kind: 'category'; category: Category; options: Option[] }

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function TransactionSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { colors } = useAppTheme()
  const {
    transactions,
    aliases,
    sources,
    toggleRecurring,
    setCategory,
    setCategoryBulk,
    setCategoryForMerchant,
    setDescriptionBulk,
  } = useStore()
  // Read the live row, so the sheet follows its own edits.
  const t = transactions.find((x) => x.id === id)
  const shownName = t ? displayDescription(t.description, aliases) : ''
  const [name, setName] = useState(shownName)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [reviewing, setReviewing] = useState<Option | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const source = useMemo(() => sources.find((s) => s.id === t?.sourceId), [sources, t?.sourceId])

  if (!t) return null

  const startOffer = (next: Offer | null) => {
    setOffer(next && next.options.length > 0 ? next : null)
    setReviewing(null)
    setExcluded(new Set())
  }

  const rename = () => {
    const clean = name.trim()
    if (!clean || clean === shownName) return
    setDescriptionBulk([t.id], clean)
    const { sameAmount, all } = renameCandidates(t, transactions, clean, aliases)
    const label = groupLabel(t.description, aliases)
    const whole: Option = { label: `all ${plural(all.length, `${label} charge`)}`, rows: all, wholeMerchant: true }
    const options: Option[] = []
    if (sameAmount.length > 0) {
      options.push({ label: `the ${plural(sameAmount.length, `${formatAbs(t.amount)} charge`)}`, rows: sameAmount, wholeMerchant: false })
      if (all.length > sameAmount.length) options.push(whole)
    } else if (all.length > 0) options.push(whole)
    startOffer({ kind: 'rename', name: clean, options })
  }

  const recategorize = (category: Category) => {
    if (category === t.category) return
    setCategory(t.id, category)
    const { sameAmount, sameMerchant } = categoryCandidates(t, transactions, category)
    const label = groupLabel(t.description, aliases)
    const whole: Option = {
      label: `all ${plural(sameMerchant.length, `${label} charge`)}`,
      rows: sameMerchant,
      wholeMerchant: true,
    }
    const options: Option[] = []
    if (sameAmount.length > 0) {
      options.push({ label: `the ${plural(sameAmount.length, `${formatAbs(t.amount)} charge`)}`, rows: sameAmount, wholeMerchant: false })
      if (sameMerchant.length > sameAmount.length) options.push(whole)
    } else if (sameMerchant.length > 0) options.push(whole)
    startOffer({ kind: 'category', category, options })
  }

  const apply = (option: Option) => {
    if (!offer) return
    const rows = option.rows.filter((r) => !excluded.has(r.id))
    if (rows.length > 0) {
      if (offer.kind === 'rename') setDescriptionBulk(rows.map((r) => r.id), offer.name)
      else if (option.wholeMerchant && rows.length === option.rows.length) {
        // The whole merchant, nothing unticked: remember it, so future imports follow.
        setCategoryForMerchant(merchantKey(rows[0].description), offer.category)
      } else setCategoryBulk(rows.map((r) => r.id), offer.category)
    }
    startOffer(null)
  }

  const meta = categoryMeta(t.category)
  const sectionTitle = { fontFamily: fonts.rounded, fontSize: 15, color: colors.ink }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.card,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Who, when, how much */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 }}>
              <MerchantLogo brand={brandForRow(t, aliases)} logoUrl={t.logoUrl} fallback={meta.emoji} size="lg" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontFamily: fonts.rounded, fontSize: 18, color: colors.ink }}>
                  {shownName}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted }}>
                  {formatDate(t.date)}
                  {source ? ` · ${source.fileName}` : ''}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={{ fontFamily: fonts.roundedSemi, fontSize: 15, color: colors.primary }}>Done</Text>
              </Pressable>
            </View>
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 28,
                fontVariant: ['tabular-nums'],
                color: t.amount > 0 ? colors.success : colors.ink,
              }}
            >
              {formatCurrency(t.amount)}
            </Text>

            {offer && (
              <OfferBox
                offer={offer}
                reviewing={reviewing}
                excluded={excluded}
                onReview={(o) => {
                  setReviewing(reviewing === o ? null : o)
                  setExcluded(new Set())
                }}
                onToggle={(rowId) =>
                  setExcluded((prev) => {
                    const next = new Set(prev)
                    if (next.has(rowId)) next.delete(rowId)
                    else next.add(rowId)
                    return next
                  })
                }
                onApply={apply}
                onDismiss={() => startOffer(null)}
              />
            )}

            {/* Recurring star */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={t.recurring ? 'star' : 'star-outline'} size={20} color={t.recurring ? colors.accent : colors.faint} />
              <View style={{ flex: 1 }}>
                <Text style={sectionTitle}>Recurring</Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                  A charge that repeats, like a bill or subscription
                </Text>
              </View>
              <Switch
                value={!!t.recurring}
                onValueChange={() => toggleRecurring(t.id)}
                trackColor={{ true: colors.accent, false: colors.border }}
                accessibilityLabel="Recurring"
              />
            </View>

            {/* Name */}
            <View style={{ gap: spacing.sm }}>
              <Text style={sectionTitle}>Name</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={rename}
                  returnKeyType="done"
                  placeholder="Merchant name"
                  placeholderTextColor={colors.faint}
                  accessibilityLabel="Name"
                  style={{
                    flex: 1,
                    minHeight: 44,
                    paddingHorizontal: spacing.sm + 4,
                    borderRadius: radii.md,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderStrong,
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
                {name.trim() !== '' && name.trim() !== shownName && (
                  <Button small title="Rename" onPress={rename} />
                )}
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>
                Renames just this charge. We&apos;ll then offer the similar ones.
              </Text>
            </View>

            {/* Category */}
            <View style={{ gap: spacing.sm }}>
              <Text style={sectionTitle}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {allCategories().map((c) => {
                  const on = c.id === t.category
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => recategorize(c.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        minHeight: 36,
                        paddingHorizontal: spacing.sm + 2,
                        borderRadius: radii.pill,
                        borderWidth: on ? 0 : StyleSheet.hairlineWidth,
                        borderColor: colors.borderStrong,
                        backgroundColor: on ? colors.primary : pressed ? colors.background : 'transparent',
                      })}
                    >
                      <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: on ? colors.card : colors.text }}>
                        {c.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** "Also rename the 3 $9.99 charges?" with review-and-untick before applying. */
function OfferBox({
  offer,
  reviewing,
  excluded,
  onReview,
  onToggle,
  onApply,
  onDismiss,
}: {
  offer: Offer
  reviewing: Option | null
  excluded: Set<string>
  onReview: (o: Option) => void
  onToggle: (id: string) => void
  onApply: (o: Option) => void
  onDismiss: () => void
}) {
  const { colors } = useAppTheme()
  const { aliases } = useStore()
  const target = offer.kind === 'rename' ? `“${offer.name}”` : categoryLabel(offer.category)
  const verb = offer.kind === 'rename' ? 'rename' : 'file'
  const joiner = offer.kind === 'rename' ? 'to' : 'as'
  return (
    <View style={{ gap: spacing.sm, borderRadius: radii.md, padding: spacing.sm + 4, backgroundColor: colors.primarySoft }}>
      <Text style={{ fontFamily: fonts.rounded, fontSize: 14, color: colors.success }}>
        Done. Also {verb} similar charges {joiner} {target}?
      </Text>
      {offer.options.map((o) => {
        const ticked = o.rows.filter((r) => !excluded.has(r.id)).length
        const open = reviewing === o
        return (
          <View key={o.label} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable onPress={() => onReview(o)} style={{ flex: 1 }} hitSlop={6}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.text }}>
                  {o.label}{' '}
                  <Text style={{ color: colors.success, textDecorationLine: 'underline' }}>{open ? 'hide' : 'see which'}</Text>
                </Text>
              </Pressable>
              <Button
                small
                title={open ? `${verb === 'rename' ? 'Rename' : 'File'} ${ticked}` : verb === 'rename' ? 'Rename' : 'File'}
                disabled={open && ticked === 0}
                onPress={() => onApply(o)}
              />
            </View>
            {open &&
              o.rows.map((r) => {
                const on = !excluded.has(r.id)
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => onToggle(r.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 }}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.primary : colors.faint} />
                    <Text style={{ width: 84, fontFamily: fonts.sans, fontSize: 12, color: colors.faint }}>{formatDate(r.date)}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.text }}>
                      {displayDescription(r.description, aliases)}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12, fontVariant: ['tabular-nums'], color: colors.muted }}>
                      {formatCurrency(r.amount)}
                    </Text>
                  </Pressable>
                )
              })}
          </View>
        )
      })}
      <Pressable onPress={onDismiss} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted }}>Not now</Text>
      </Pressable>
    </View>
  )
}
