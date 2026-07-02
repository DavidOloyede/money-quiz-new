/**
 * Web-only Plaid Link launcher. Loads Plaid's hosted Link script from their
 * CDN and opens it; the user authenticates with their bank inside Plaid's
 * iframe, so credentials never touch this app. Used only in real (non-mock)
 * mode. Mobile uses react-native-plaid-link-sdk instead — this file must not
 * be imported from shared code (document/script tags are web APIs).
 */

export interface PlaidLinkMetadata {
  institution?: { name?: string } | null
}

export function openPlaidLink(
  token: string,
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void,
  onExit?: (err: unknown) => void,
) {
  const w = window as unknown as {
    Plaid?: { create: (opts: Record<string, unknown>) => { open: () => void } }
  }
  const start = () => {
    const handler = w.Plaid!.create({
      token,
      onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => onSuccess(publicToken, metadata),
      onExit: (err: unknown) => onExit?.(err),
    })
    handler.open()
  }
  if (w.Plaid) return start()
  const s = document.createElement('script')
  s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
  s.onload = start
  s.onerror = () => onExit?.(new Error('Failed to load Plaid Link'))
  document.head.appendChild(s)
}
