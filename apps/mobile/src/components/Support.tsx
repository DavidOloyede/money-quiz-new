/**
 * Help & support — file a ticket and read replies, the mobile SupportCard.
 * Hidden when accounts aren't configured; asks for sign-in when signed out.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  TICKET_CATEGORIES,
  ticketsApi,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '@moneyquiz/core/lib/tickets'

import { useAuth } from '@/lib/auth'
import { Button, Card, CardTitle, Note, StatusLine } from '@/components/ui'
import { fonts, radii, spacing, useAppTheme } from '@/theme'

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'open',
  in_progress: 'in progress',
  resolved: 'resolved',
  closed: 'closed',
}

export function Support() {
  const { colors } = useAppTheme()
  const { enabled, session } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(TICKET_CATEGORIES[0])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = session?.user.id

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { tickets } = await ticketsApi.list()
      setTickets(tickets ?? [])
    } catch {
      // Offline or server down — the card still renders; sending will surface errors.
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  if (!enabled) return null

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await ticketsApi.create(subject.trim(), body.trim(), category)
      setSubject('')
      setBody('')
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your ticket.')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  }

  return (
    <Card>
      <CardTitle>🛟 Help & support</CardTitle>
      <Note>Found a bug or need a hand? Send us a ticket and we&apos;ll reply right here.</Note>

      {!session ? (
        <Note>Sign in above to submit a ticket.</Note>
      ) : (
        <>
          {!showForm && <Button title="New ticket" onPress={() => setShowForm(true)} small />}

          {showForm && (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={colors.faint}
                style={inputStyle}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {TICKET_CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs,
                      borderRadius: 999,
                      backgroundColor: category === c ? colors.primary : 'transparent',
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: category === c ? colors.primary : colors.borderStrong,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 12,
                        color: category === c ? colors.card : colors.muted,
                      }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="What happened? What did you expect?"
                placeholderTextColor={colors.faint}
                multiline
                numberOfLines={4}
                style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
              />
              {error && <StatusLine kind="error">{error}</StatusLine>}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Cancel" variant="outline" small onPress={() => setShowForm(false)} />
                <Button
                  title={busy ? 'Sending…' : 'Send ticket'}
                  small
                  onPress={() => void submit()}
                  disabled={busy || !subject.trim() || !body.trim()}
                />
              </View>
            </View>
          )}

          {tickets.map((t) => (
            <View key={t.id} style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() => setOpenId(openId === t.id ? null : t.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}
                >
                  {t.subject}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    backgroundColor:
                      t.status === 'resolved'
                        ? colors.primarySoft
                        : t.status === 'closed'
                          ? colors.background
                          : colors.accentSoft,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 10,
                      color:
                        t.status === 'resolved'
                          ? colors.success
                          : t.status === 'closed'
                            ? colors.muted
                            : colors.accentDeep,
                    }}
                  >
                    {STATUS_LABEL[t.status]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.faint }}>
                  {new Date(t.updated_at).toLocaleDateString()}
                </Text>
              </Pressable>
              {openId === t.id && userId && (
                <Thread ticket={t} selfId={userId} onReplied={() => void load()} />
              )}
            </View>
          ))}
        </>
      )}
    </Card>
  )
}

function Thread({
  ticket,
  selfId,
  onReplied,
}: {
  ticket: Ticket
  selfId: string
  onReplied: () => void
}) {
  const { colors } = useAppTheme()
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { messages } = await ticketsApi.messages(ticket.id)
    setMessages(messages ?? [])
  }, [ticket.id])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      await ticketsApi.reply(ticket.id, reply.trim())
      setReply('')
      await load()
      onReplied()
    } finally {
      setBusy(false)
    }
  }

  const bubble = (mine: boolean) => ({
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    backgroundColor: mine ? colors.primarySoft : colors.background,
  })

  return (
    <View style={{ gap: spacing.sm, paddingLeft: spacing.sm }}>
      <View style={bubble(false)}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.text }}>
          {ticket.body}
        </Text>
      </View>
      {messages.map((m) => {
        const mine = m.author_id === selfId
        return (
          <View key={m.id} style={bubble(mine)}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 10, color: colors.faint, marginBottom: 2 }}>
              {mine ? 'You' : 'Support'} · {new Date(m.created_at).toLocaleString()}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.text }}>
              {m.body}
            </Text>
          </View>
        )
      })}
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Write a reply…"
          placeholderTextColor={colors.faint}
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderStrong,
            borderRadius: radii.md,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontFamily: fonts.sans,
            fontSize: 13,
            color: colors.text,
          }}
        />
        <Button title="Reply" small onPress={() => void send()} disabled={busy || !reply.trim()} />
      </View>
    </View>
  )
}
