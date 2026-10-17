process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';

import { GraphQLError } from 'graphql';
import { userInviteResolver } from '~/data/resolvers/userInviteResolver';
import * as auth from '~/data/utils/authentication';
import { CURRENT_TERMS_VERSION } from '~/data/utils/termsPolicy';
import type { GraphQLContext } from '~/types/graphql';

jest.mock('~/data/utils/send-grid-mail', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ success: true }),
  SENDGRID_TEMPLATE_IDS: {
    INVITE_REQUEST_RECEIVED_CONFIRMATION: 'tpl-confirm',
    INVITATION_APPROVE: 'tpl-approve',
    INVITATION_DECLINE: 'tpl-decline',
  },
}));

jest.mock('~/data/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const userId = '507f1f77bcf86cd799439011';

function mockContext(overrides: Partial<GraphQLContext> = {}): GraphQLContext {
  return {
    prisma: {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    },
    user: { _id: userId, admin: true },
    ...overrides,
  } as unknown as GraphQLContext;
}

describe('userInviteResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('completeSignup', () => {
    it('rejects missing or stale Terms version', async () => {
      const ctx = mockContext();
      const token = auth.generateInviteSignupToken(userId);

      await expect(
        userInviteResolver.Mutation.completeSignup(
          null,
          {
            token,
            username: 'newuser',
            password: 'Password1',
            acceptedTermsVersion: 'stale',
          },
          ctx
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('rejects when invite user already has a password', async () => {
      const ctx = mockContext();
      const token = auth.generateInviteSignupToken(userId);
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        password: 'already-set',
        accountStatus: 'pending',
        email: 'a@b.com',
      });

      await expect(
        userInviteResolver.Mutation.completeSignup(
          null,
          {
            token,
            username: 'newuser',
            password: 'Password1',
            acceptedTermsVersion: CURRENT_TERMS_VERSION,
          },
          ctx
        )
      ).rejects.toThrow(/already been completed/);
    });

    it('creates user password and TermsAcceptance atomically', async () => {
      const ctx = mockContext();
      const token = auth.generateInviteSignupToken(userId);
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        password: null,
        accountStatus: 'pending',
        email: 'invitee@example.com',
      });
      (ctx.prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (ctx.prisma.user.update as jest.Mock).mockResolvedValue({
        id: userId,
        username: 'newuser',
        name: null,
        accountStatus: 'active',
      });

      const result = await userInviteResolver.Mutation.completeSignup(
        null,
        {
          token,
          username: 'newuser',
          password: 'Password1',
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
        ctx
      );

      expect(ctx.prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            username: 'newuser',
            accountStatus: 'active',
            termsAcceptances: {
              create: expect.objectContaining({
                termsVersion: CURRENT_TERMS_VERSION,
                source: 'invite_completion',
              }),
            },
          }),
        })
      );
      expect(result).toMatchObject({ _id: userId, username: 'newuser' });
    });

    it('rejects a forged session-style token without invite type', async () => {
      const ctx = mockContext();
      await expect(
        userInviteResolver.Mutation.completeSignup(
          null,
          {
            token: 'not-a-valid-token',
            username: 'newuser',
            password: 'Password1',
            acceptedTermsVersion: CURRENT_TERMS_VERSION,
          },
          ctx
        )
      ).rejects.toThrow(/Invalid invite signup token/);
    });
  });

  describe('verifyInviteSignupToken', () => {
    it('returns user info for a valid unused invite token', async () => {
      const ctx = mockContext();
      const token = auth.generateInviteSignupToken(userId);
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'invitee@example.com',
        username: 'invitee@example.com',
        password: null,
        accountStatus: 'pending',
      });

      const result = await userInviteResolver.Query.verifyInviteSignupToken(null, { token }, ctx);

      expect(result).toEqual({
        _id: userId,
        email: 'invitee@example.com',
        username: 'invitee@example.com',
      });
    });

    it('returns null when signup was already completed', async () => {
      const ctx = mockContext();
      const token = auth.generateInviteSignupToken(userId);
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'invitee@example.com',
        username: 'done',
        password: 'hashed',
        accountStatus: 'active',
      });

      const result = await userInviteResolver.Query.verifyInviteSignupToken(null, { token }, ctx);

      expect(result).toBeNull();
    });
  });

  describe('requestUserAccess', () => {
    it('creates a pending user without password', async () => {
      const ctx = mockContext({ user: null });
      (ctx.prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (ctx.prisma.user.create as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'new@example.com',
        username: 'new@example.com',
        accountStatus: 'pending',
        password: null,
      });

      const result = await userInviteResolver.Mutation.requestUserAccess(
        null,
        { requestUserAccessInput: { email: 'new@example.com' } },
        ctx
      );

      expect(ctx.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            accountStatus: 'pending',
            password: null,
          }),
        })
      );
      expect(result._id).toBe(userId);
    });
  });
});
