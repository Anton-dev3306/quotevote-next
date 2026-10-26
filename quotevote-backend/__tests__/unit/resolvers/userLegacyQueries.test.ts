/**
 * Queries the frontend calls that had no resolver in the new backend (#623):
 * users, checkDuplicateEmail, verifyUserPasswordResetToken and userInviteRequests.
 */

import { GraphQLError } from 'graphql';
import { userResolver } from '~/data/resolvers/userResolver';
import { userInviteResolver } from '~/data/resolvers/userInviteResolver';
import { verifyToken } from '~/data/utils/authentication';
import { PUBLIC_USER_SELECT } from '~/data/utils/userPrismaMapper';
import type { GraphQLContext } from '~/types/graphql';

jest.mock('~/data/utils/authentication', () => ({
  ...jest.requireActual('~/data/utils/authentication'),
  verifyToken: jest.fn(),
}));

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

const adminId = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';

function mockContext(user: GraphQLContext['user'] | undefined): GraphQLContext {
  return {
    prisma: {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    },
    user,
  } as unknown as GraphQLContext;
}

const asAdmin = () => mockContext({ _id: adminId, admin: true } as GraphQLContext['user']);
const asMember = () => mockContext({ _id: memberId, admin: false } as GraphQLContext['user']);
const asGuest = () => mockContext(undefined);

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(GraphQLError);
  await promise.catch((err: GraphQLError) => expect(err.extensions.code).toBe(code));
}

describe('legacy user queries (#623)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.users', () => {
    it('requires a signed-in admin', async () => {
      await expectCode(userResolver.Query.users(null, {}, asGuest()), 'UNAUTHENTICATED');
      await expectCode(userResolver.Query.users(null, {}, asMember()), 'FORBIDDEN');
    });

    it('returns public fields only, newest first, 50 by default', async () => {
      const ctx = asAdmin();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: memberId, username: 'bob', name: 'Bob', contributorBadge: true },
      ]);

      const result = await userResolver.Query.users(null, {}, ctx);

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { joined: 'desc' },
        skip: 0,
        take: 50,
        select: PUBLIC_USER_SELECT,
      });
      expect(result[0]).toEqual(
        expect.objectContaining({ _id: memberId, username: 'bob', contributorBadge: true })
      );
      expect(result[0]).not.toHaveProperty('password');
    });

    it('caps the page at 100 and ignores negative paging', async () => {
      const ctx = asAdmin();

      await userResolver.Query.users(null, { limit: 500, offset: -5 }, ctx);

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 })
      );
    });
  });

  describe('Query.checkDuplicateEmail', () => {
    it('rejects an invalid email', async () => {
      await expectCode(
        userResolver.Query.checkDuplicateEmail(null, { email: 'not-an-email' }, asGuest()),
        'BAD_USER_INPUT'
      );
    });

    it('matches case-insensitively without a regex and returns no user fields', async () => {
      const ctx = asGuest();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([{ status: 4 }]);

      const result = await userResolver.Query.checkDuplicateEmail(
        null,
        { email: ' Alice@Example.com ' },
        ctx
      );

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith({
        where: { email: { equals: 'Alice@Example.com', mode: 'insensitive' } },
        select: { status: true },
      });
      expect(result).toEqual([{ isDuplicate: false, duplicateCount: 1 }]);
    });

    it('treats an undecided access request as not a duplicate', async () => {
      const ctx = asGuest();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([{ status: 1 }]);

      const result = await userResolver.Query.checkDuplicateEmail(
        null,
        { email: 'new@example.com' },
        ctx
      );

      expect(result).toEqual([]);
    });

    it('returns an empty list when no account uses the email', async () => {
      const result = await userResolver.Query.checkDuplicateEmail(
        null,
        { email: 'nobody@example.com' },
        asGuest()
      );

      expect(result).toEqual([]);
    });
  });

  describe('Query.verifyUserPasswordResetToken', () => {
    it('returns the id, username and email for a valid token', async () => {
      const ctx = asGuest();
      mockVerifyToken.mockResolvedValue({ userId: memberId, username: 'bob', email: 'b@x' });
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: memberId,
        email: 'bob@example.com',
        username: 'bob',
        accountStatus: 'active',
      });

      const result = await userResolver.Query.verifyUserPasswordResetToken(
        null,
        { token: 'valid' },
        ctx
      );

      expect(ctx.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: memberId },
        select: { id: true, email: true, username: true, accountStatus: true },
      });
      expect(result).toEqual({ _id: memberId, email: 'bob@example.com', username: 'bob' });
    });

    it('accepts reset links issued by the legacy server, which carry `_id`', async () => {
      const ctx = asGuest();
      mockVerifyToken.mockResolvedValue({ _id: memberId } as unknown as Awaited<
        ReturnType<typeof verifyToken>
      >);
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: memberId,
        email: 'bob@example.com',
        username: 'bob',
        accountStatus: 'active',
      });

      const result = await userResolver.Query.verifyUserPasswordResetToken(
        null,
        { token: 'legacy' },
        ctx
      );

      expect(result).toEqual({ _id: memberId, email: 'bob@example.com', username: 'bob' });
    });

    it('returns null for an invalid or expired token instead of an auth error', async () => {
      const ctx = asGuest();
      mockVerifyToken.mockRejectedValue(
        new GraphQLError('expired', { extensions: { code: 'UNAUTHENTICATED' } })
      );

      await expect(
        userResolver.Query.verifyUserPasswordResetToken(null, { token: 'bad' }, ctx)
      ).resolves.toBeNull();
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns null for an empty token, a disabled account or a missing user', async () => {
      await expect(
        userResolver.Query.verifyUserPasswordResetToken(null, { token: ' ' }, asGuest())
      ).resolves.toBeNull();

      mockVerifyToken.mockResolvedValue({ userId: memberId, username: 'bob', email: 'b@x' });
      const disabled = asGuest();
      (disabled.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: memberId,
        email: 'bob@example.com',
        username: 'bob',
        accountStatus: 'disabled',
      });
      await expect(
        userResolver.Query.verifyUserPasswordResetToken(null, { token: 't' }, disabled)
      ).resolves.toBeNull();

      const missing = asGuest();
      (missing.prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        userResolver.Query.verifyUserPasswordResetToken(null, { token: 't' }, missing)
      ).resolves.toBeNull();
    });
  });

  describe('Query.userInviteRequests', () => {
    it('requires a signed-in admin', async () => {
      await expectCode(
        userInviteResolver.Query.userInviteRequests(null, {}, asGuest()),
        'UNAUTHENTICATED'
      );
      await expectCode(
        userInviteResolver.Query.userInviteRequests(null, {}, asMember()),
        'FORBIDDEN'
      );
    });

    it('lists requested and declined users with the status as a string', async () => {
      const ctx = asAdmin();
      const joined = new Date('2026-10-16T13:51:48.795Z');
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: memberId, email: 'new@example.com', status: 1, joined },
        { id: adminId, email: 'no@example.com', status: 2, joined },
      ]);

      const result = await userInviteResolver.Query.userInviteRequests(null, {}, ctx);

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith({
        where: { status: { in: [1, 2] } },
        orderBy: { joined: 'desc' },
        select: { id: true, email: true, status: true, joined: true },
      });
      expect(result).toEqual([
        { _id: memberId, email: 'new@example.com', status: '1', joined },
        { _id: adminId, email: 'no@example.com', status: '2', joined },
      ]);
    });
  });
});
