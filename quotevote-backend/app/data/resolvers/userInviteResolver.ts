/**
 * Invitation request, approval, and Terms-gated signup completion (#573).
 */

import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';
import sendGridEmail, { SENDGRID_TEMPLATE_IDS } from '~/data/utils/send-grid-mail';
import {
  generateHashPassword,
  generateInviteSignupToken,
  verifyInviteSignupToken,
} from '~/data/utils/authentication';
import {
  CURRENT_TERMS_HASH,
  CURRENT_TERMS_VERSION,
  isCurrentTermsVersion,
} from '~/data/utils/termsPolicy';
import {
  PUBLIC_USER_SELECT,
  toPublicUser,
  type PrismaUserRecord,
} from '~/data/utils/userPrismaMapper';
import { logger } from '~/data/utils/logger';
import type * as Common from '~/types/common';
import type { GraphQLContext } from '~/types/graphql';

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

function isObjectId(id: string): boolean {
  return OBJECT_ID_PATTERN.test(id);
}

function isApprovedInviteStatus(inviteStatus: string): boolean {
  const normalized = inviteStatus.trim().toLowerCase();
  return normalized === 'approved' || normalized === '4';
}

function isDeclinedInviteStatus(inviteStatus: string): boolean {
  const normalized = inviteStatus.trim().toLowerCase();
  return normalized === 'declined' || normalized === '2';
}

export const userInviteResolver = {
  Query: {
    verifyInviteSignupToken: async (
      _parent: unknown,
      args: { token: string },
      context: GraphQLContext
    ): Promise<{ _id: string; email: string; username: string } | null> => {
      if (!args.token?.trim()) {
        throw new GraphQLError('Invite token is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const payload = verifyInviteSignupToken(args.token);
      const user = await context.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, username: true, password: true, accountStatus: true },
      });

      if (!user || user.accountStatus === 'disabled') {
        return null;
      }

      // Already completed accounts should not reuse the invite token.
      if (user.password) {
        return null;
      }

      return {
        _id: user.id,
        email: user.email,
        username: user.username,
      };
    },
  },

  Mutation: {
    requestUserAccess: async (
      _parent: unknown,
      args: { requestUserAccessInput: Common.RequestUserAccessInput },
      context: GraphQLContext
    ): Promise<Common.User> => {
      const email = args.requestUserAccessInput?.email?.trim().toLowerCase();
      if (!email) {
        throw new GraphQLError('Email is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const existingUser = await context.prisma.user.findFirst({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          accountStatus: true,
          password: true,
          avatar: true,
          bio: true,
          contributorBadge: true,
          upvotes: true,
          downvotes: true,
          followingIds: true,
          followerIds: true,
          reputation: true,
          isAdmin: true,
        },
      });

      let user = existingUser;

      if (existingUser) {
        // Active completed accounts cannot re-request access under the same email.
        if (existingUser.password && existingUser.accountStatus === 'active') {
          throw new GraphQLError('Email already exists', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      } else {
        try {
          user = await context.prisma.user.create({
            data: {
              email,
              username: email,
              accountStatus: 'pending',
              password: null,
            },
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
              accountStatus: true,
              password: true,
              avatar: true,
              bio: true,
              contributorBadge: true,
              upvotes: true,
              downvotes: true,
              followingIds: true,
              followerIds: true,
              reputation: true,
              isAdmin: true,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            throw new GraphQLError('Email already exists', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
          throw err;
        }
      }

      if (!user) {
        throw new GraphQLError('Unable to create access request', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      try {
        const result = await sendGridEmail({
          to: email,
          templateId: SENDGRID_TEMPLATE_IDS.INVITE_REQUEST_RECEIVED_CONFIRMATION,
        });
        if (result.error) {
          logger.warn('requestUserAccess email failed', { error: result.error });
        }
      } catch (err) {
        // Do not fail the request if mail is misconfigured in local/dev.
        logger.warn('requestUserAccess email error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return toPublicUser(user as PrismaUserRecord);
    },

    sendUserInviteApproval: async (
      _parent: unknown,
      args: { userId: string; inviteStatus: string },
      context: GraphQLContext
    ): Promise<{ code: string; message: string; inviteToken?: string }> => {
      if (!context.user?._id || context.user.admin !== true) {
        throw new GraphQLError('Admin authentication required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      if (!args.userId || !isObjectId(args.userId)) {
        throw new GraphQLError('Valid userId is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const invitedUser = await context.prisma.user.findUnique({
        where: { id: args.userId },
        select: { id: true, email: true, username: true, password: true },
      });

      if (!invitedUser) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const mailTo = invitedUser.email;

      if (isApprovedInviteStatus(args.inviteStatus)) {
        if (invitedUser.password) {
          throw new GraphQLError('User has already completed signup', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        // Keep pending until completeSignup writes password + TermsAcceptance.
        await context.prisma.user.update({
          where: { id: invitedUser.id },
          data: { accountStatus: 'pending' },
        });

        const inviteToken = generateInviteSignupToken(invitedUser.id);
        const signupPath = `/auths/signup?token=${encodeURIComponent(inviteToken)}`;

        try {
          await sendGridEmail({
            to: mailTo,
            subject: 'Your invitation to Quote is approved',
            templateId: SENDGRID_TEMPLATE_IDS.INVITATION_APPROVE,
            dynamicTemplateData: {
              create_password_url: `${clientUrl}${signupPath}`,
            },
          });
        } catch (err) {
          logger.warn('sendUserInviteApproval email error', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        return {
          code: 'SUCCESS',
          message: `User sign-up invite sent successfully to ${mailTo}.`,
          // Exposed for tests / local ops when email is unavailable.
          inviteToken: process.env.NODE_ENV === 'test' ? inviteToken : undefined,
        };
      }

      if (isDeclinedInviteStatus(args.inviteStatus)) {
        await context.prisma.user.update({
          where: { id: invitedUser.id },
          data: { accountStatus: 'disabled' },
        });

        try {
          await sendGridEmail({
            to: mailTo,
            subject: 'Your invitation to Quote has been declined',
            templateId: SENDGRID_TEMPLATE_IDS.INVITATION_DECLINE,
          });
        } catch (err) {
          logger.warn('sendUserInviteApproval decline email error', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        return {
          code: 'SUCCESS',
          message: `User invite declined for ${mailTo}.`,
        };
      }

      return {
        code: 'SUCCESS',
        message: 'User Invite reset',
      };
    },

    completeSignup: async (
      _parent: unknown,
      args: {
        token: string;
        username: string;
        password: string;
        acceptedTermsVersion: string;
      },
      context: GraphQLContext
    ): Promise<Common.User> => {
      const username = args.username?.trim();
      const password = args.password;
      const token = args.token?.trim();

      if (!token || !username || !password) {
        throw new GraphQLError('token, username, and password are required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!isCurrentTermsVersion(args.acceptedTermsVersion)) {
        throw new GraphQLError('You must accept the current Terms of Service to complete signup', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new GraphQLError('Invalid username', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (password.length < 8) {
        throw new GraphQLError('Password must be at least 8 characters', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const payload = verifyInviteSignupToken(token);

      const existing = await context.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, password: true, accountStatus: true, email: true },
      });

      if (!existing || existing.accountStatus === 'disabled') {
        throw new GraphQLError('Invite is invalid or the account is unavailable', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (existing.password) {
        throw new GraphQLError('Signup has already been completed for this invite', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const usernameTaken = await context.prisma.user.findFirst({
        where: {
          username,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (usernameTaken) {
        throw new GraphQLError('Username already exists!', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const hashedPassword = await generateHashPassword(password);

      try {
        const updated = await context.prisma.user.update({
          where: { id: existing.id },
          data: {
            username,
            password: hashedPassword,
            accountStatus: 'active',
            termsAcceptances: {
              create: {
                termsVersion: CURRENT_TERMS_VERSION,
                termsHash: CURRENT_TERMS_HASH,
                source: 'invite_completion',
              },
            },
          },
          select: {
            ...PUBLIC_USER_SELECT,
            email: true,
            accountStatus: true,
          },
        });

        return toPublicUser(updated as PrismaUserRecord);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new GraphQLError('Username already exists or terms already accepted', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw err;
      }
    },
  },
};
