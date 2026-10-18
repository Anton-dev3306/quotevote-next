/**
 * Tests for request-access email validation (long TLDs + trim).
 */
import {
  parseRequestAccessEmail,
  requestAccessEmailSchema,
} from '@/lib/validation/requestAccessSchema'

describe('requestAccessEmailSchema', () => {
  it('accepts common short TLDs', () => {
    expect(requestAccessEmailSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
  })

  it('accepts modern long TLDs (regression for #588)', () => {
    expect(
      requestAccessEmailSchema.safeParse({ email: 'test@example.technology' }).success
    ).toBe(true)
    expect(
      requestAccessEmailSchema.safeParse({ email: 'user@brand.engineering' }).success
    ).toBe(true)
  })

  it('rejects empty email', () => {
    const result = requestAccessEmailSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects clearly invalid addresses', () => {
    expect(requestAccessEmailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(requestAccessEmailSchema.safeParse({ email: 'missing@tld' }).success).toBe(false)
  })
})

describe('parseRequestAccessEmail', () => {
  it('trims whitespace and returns normalized email (review feedback)', () => {
    const result = parseRequestAccessEmail('  test@example.technology  ')
    expect(result).toEqual({ success: true, email: 'test@example.technology' })
  })

  it('rejects whitespace-only input', () => {
    const result = parseRequestAccessEmail('   ')
    expect(result.success).toBe(false)
  })

  it('accepts .co.uk style domains', () => {
    const result = parseRequestAccessEmail('user@example.co.uk')
    expect(result).toEqual({ success: true, email: 'user@example.co.uk' })
  })
})
