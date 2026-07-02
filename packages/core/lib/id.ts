/**
 * Unique ids for transactions and import sources. Lives apart from storage so
 * pure data modules (CSV parsing, quiz generation, sample data) don't have to
 * touch the persistence layer just to mint an id.
 */
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
