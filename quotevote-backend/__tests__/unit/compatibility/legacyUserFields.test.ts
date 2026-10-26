/**
 * User fields the legacy server writes under other names (#629). Both servers
 * share the same documents, so Prisma has to read and write the legacy names.
 */

import { Prisma } from '@prisma/client';

const userFields = Prisma.dmmf.datamodel.models.find((model) => model.name === 'User')?.fields;

const storedName = (field: string): string | null | undefined => {
  const match = userFields?.find((f) => f.name === field);
  return match ? (match.dbName ?? match.name) : undefined;
};

describe('legacy User field names', () => {
  it('stores the password hash in hash_password, like the legacy server', () => {
    expect(storedName('password')).toBe('hash_password');
  });

  it('keeps the other renamed legacy fields', () => {
    expect(storedName('isAdmin')).toBe('admin');
    expect(storedName('followingIds')).toBe('_followingId');
    expect(storedName('followerIds')).toBe('_followersId');
    expect(storedName('wallet')).toBe('_wallet');
  });
});
