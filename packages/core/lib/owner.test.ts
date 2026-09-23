import { describe, expect, it } from 'vitest'
import {
  counterparty,
  counterpartyKey,
  counterpartyLabel,
  isSelfTransfer,
  isTransferDescription,
  matchesOwner,
  normalizeOwnerPhrase,
} from './owner'

// Invented names throughout; the descriptor SHAPES mirror real exports.
const OWNER = ['Jordan Avery', 'Avery Jordan', 'Averybank']

describe('matchesOwner', () => {
  it('ignores case and repeated whitespace', () => {
    // Real exports pad names out: "JORDAN  AVERY" with a double space.
    expect(matchesOwner('Zelle payment to JORDAN  AVERY', OWNER)).toBe(true)
    expect(matchesOwner('zelle payment to jordan avery', OWNER)).toBe(true)
  })

  it('matches a name written the other way round, when both are listed', () => {
    expect(matchesOwner('PAYPAL *Avery Jordan', OWNER)).toBe(true)
  })

  it('sees through punctuation the bank inserts', () => {
    expect(matchesOwner('CASH APP*JORDAN AVERY', OWNER)).toBe(true)
    expect(matchesOwner('APPLE CASH BANK XFER Jordan Avery', OWNER)).toBe(true)
  })

  it('matches an account nickname', () => {
    expect(matchesOwner('Zelle payment to Averybank JPM99cwmvuv3', OWNER)).toBe(true)
  })

  it('only matches whole words', () => {
    // "Avery" alone must not swallow an unrelated merchant.
    expect(matchesOwner('AVERYBROOK GRILL', ['Avery'])).toBe(false)
    expect(matchesOwner('AVERY GRILL', ['Avery'])).toBe(true)
  })

  it('is false with no phrases configured', () => {
    expect(matchesOwner('Zelle payment to Jordan Avery', [])).toBe(false)
  })

  it('normalizes a phrase the way descriptions are normalized', () => {
    expect(normalizeOwnerPhrase('  JORDAN   Avery ')).toBe('jordan avery')
  })
})

describe('isTransferDescription', () => {
  it.each([
    'Zelle payment to Priya Raman',
    'CASH APP*PRIYA RAMAN',
    'PAYPAL *Priya Raman',
    'APPLE CASH BANK XFER Priya Raman',
    'Online Transfer to SAV 4821',
    'WIRE TRANSFER FEE',
  ])('recognizes %s', (d) => {
    expect(isTransferDescription(d)).toBe(true)
  })

  it('leaves ordinary spending alone', () => {
    expect(isTransferDescription('CORNER COFFEE ROASTERS')).toBe(false)
    expect(isTransferDescription('NORTHSIDE GROCERY CO')).toBe(false)
  })
})

describe('isSelfTransfer', () => {
  it('treats a bank transfer between your own accounts as internal', () => {
    // No owner phrase needed — the bank already said what it is.
    expect(isSelfTransfer('Online Transfer to SAV 4821', [])).toBe(true)
    expect(isSelfTransfer('Online Transfer from CHK 1092', [])).toBe(true)
  })

  it('treats a peer payment naming you as internal', () => {
    expect(isSelfTransfer('Zelle payment to JORDAN  AVERY', OWNER)).toBe(true)
  })

  it('leaves a payment to someone else alone', () => {
    expect(isSelfTransfer('Zelle payment to Priya Raman', OWNER)).toBe(false)
  })

  it('does not fire on a merchant that merely contains your name', () => {
    expect(isSelfTransfer('AVERY HARDWARE SUPPLY', OWNER)).toBe(false)
  })
})

describe('counterparty', () => {
  it('reads the name after "to" or "from"', () => {
    expect(counterpartyKey('Zelle payment to Priya Raman')).toBe('priya raman')
    expect(counterpartyKey('Zelle payment from Dana Whitlock')).toBe('dana whitlock')
  })

  it('reads the name after the service when there is no to/from', () => {
    expect(counterpartyKey('CASH APP*PRIYA RAMAN')).toBe('priya raman')
    expect(counterpartyKey('PAYPAL *Dana Whitlock')).toBe('dana whitlock')
  })

  it('drops the reference blob banks append', () => {
    expect(counterpartyKey('Zelle payment to Priya Raman JPM99cwmvuv3')).toBe('priya raman')
    expect(counterpartyKey('Zelle payment from Dana Whitlock WEB ID: 4821')).toBe('dana whitlock')
  })

  it('groups one person across services, since the key is the name alone', () => {
    expect(counterpartyKey('Zelle payment to Priya Raman')).toBe(
      counterpartyKey('CASH APP*PRIYA RAMAN'),
    )
  })

  it('groups both directions together', () => {
    expect(counterpartyKey('Zelle payment to Dana Whitlock')).toBe(
      counterpartyKey('Zelle payment from Dana Whitlock'),
    )
  })

  it('title-cases the label', () => {
    expect(counterpartyLabel('Zelle payment to PRIYA RAMAN')).toBe('Priya Raman')
  })

  it('handles a business name', () => {
    expect(counterpartyLabel('Zelle payment to Diamond Electric Services Inc')).toBe(
      'Diamond Electric Services',
    )
  })

  it('groups rows that name nobody under the service instead', () => {
    // Some descriptors carry only a reference: "PAYPAL TRANSFER PPD ID: P…".
    // Without this they became a counterparty called "Transfer".
    expect(counterpartyLabel('PAYPAL TRANSFER PPD ID: P123456')).toBe('Paypal')
    expect(counterpartyLabel('APPLE CASH SENT MONEY 1I8872 CA 07/14')).toBe('Apple Cash')
    // Banks truncate mid-word, so the generic wording arrives clipped.
    expect(counterpartyLabel('APPLE CASH SENT MONE 1I8872 CA 07/14')).toBe('Apple Cash')
  })

  it('drops a trailing state code rather than treating it as a surname', () => {
    expect(counterpartyKey('Zelle payment to Priya Raman TX')).toBe('priya raman')
  })

  it('is null for a row that isn’t a transfer at all', () => {
    expect(counterparty('CORNER COFFEE ROASTERS')).toBeNull()
    expect(counterpartyKey('CORNER COFFEE ROASTERS')).toBe('')
  })
})
