/**
 * Tests for request-access email validation (long TLDs).
 */
import { requestAccessEmailSchema } from '@/lib/validation/requestAccessSchema'

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
