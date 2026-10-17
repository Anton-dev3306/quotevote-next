import {
  CURRENT_TERMS_HASH,
  CURRENT_TERMS_VERSION,
  isCurrentTermsVersion,
} from '~/data/utils/termsPolicy';

describe('termsPolicy', () => {
  it('exposes a stable version and hash', () => {
    expect(CURRENT_TERMS_VERSION).toBe('2026-10-15');
    expect(CURRENT_TERMS_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  it('accepts only the current version string', () => {
    expect(isCurrentTermsVersion(CURRENT_TERMS_VERSION)).toBe(true);
    expect(isCurrentTermsVersion('stale')).toBe(false);
    expect(isCurrentTermsVersion(null)).toBe(false);
    expect(isCurrentTermsVersion(undefined)).toBe(false);
    expect(isCurrentTermsVersion(true)).toBe(false);
  });
});
