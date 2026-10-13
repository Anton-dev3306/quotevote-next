/**
 * Test suite for score resolver utilities.
 */

import type { PrismaClient } from '@prisma/client';
import {
  scoreUtil,
  voteTypeUtil,
  upvotes,
  downvotes,
  topUsers,
} from '~/data/resolvers/utils/scores';

jest.mock('~/data/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function mockPrisma() {
  return {
    vote: {
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as Pick<PrismaClient, 'vote' | 'user'>;
}

/** Mock vote.count to return up/down counts based on where.type. */
function mockVoteCounts(
  prisma: Pick<PrismaClient, 'vote'>,
  upvoteCount: number,
  downvoteCount: number
): void {
  (prisma.vote.count as jest.Mock).mockImplementation(
    ({ where }: { where: { type?: string } }) => {
      if (where.type === 'up') return Promise.resolve(upvoteCount);
      if (where.type === 'down') return Promise.resolve(downvoteCount);
      return Promise.resolve(0);
    }
  );
}

describe('scores resolver utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scoreUtil', () => {
    it('should calculate net score from mixed votes', async () => {
      const prisma = mockPrisma();
      mockVoteCounts(prisma, 2, 1);

      const result = await scoreUtil(prisma, { user_id: 'user1' });
      expect(result).toBe(1); // 2 ups - 1 down = 1
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { userId: 'user1', type: 'up' },
      });
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { userId: 'user1', type: 'down' },
      });
    });

    it('should return 0 for no votes', async () => {
      const prisma = mockPrisma();

      const result = await scoreUtil(prisma, {});
      expect(result).toBe(0);
    });

    it('should return 0 without querying for legacy song_id / artist_id filters', async () => {
      const prisma = mockPrisma();

      const result = await scoreUtil(prisma, { song_id: 'song1', artist_id: 'artist1' });
      expect(result).toBe(0);
      expect(prisma.vote.count).not.toHaveBeenCalled();
    });
  });

  describe('voteTypeUtil', () => {
    it('should filter by upvotes when vote_type is true', async () => {
      const prisma = mockPrisma();
      (prisma.vote.count as jest.Mock).mockResolvedValue(2);

      const result = await voteTypeUtil(prisma, { vote_type: true });
      expect(result).toBe(2);
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { type: 'up' },
      });
    });

    it('should filter by downvotes when vote_type is false', async () => {
      const prisma = mockPrisma();
      (prisma.vote.count as jest.Mock).mockResolvedValue(1);

      const result = await voteTypeUtil(prisma, { vote_type: false });
      expect(result).toBe(-1);
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { type: 'down' },
      });
    });
  });

  describe('upvotes', () => {
    it('should count upvotes matching the filter', async () => {
      const prisma = mockPrisma();
      (prisma.vote.count as jest.Mock).mockResolvedValue(2);

      const result = await upvotes(prisma, { user_id: 'user1' });
      expect(result).toBe(2);
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { userId: 'user1', type: 'up' },
      });
    });

    it('should return 0 for no upvotes', async () => {
      const prisma = mockPrisma();

      const result = await upvotes(prisma, {});
      expect(result).toBe(0);
    });

    it('should return 0 without querying for legacy song_id filters', async () => {
      const prisma = mockPrisma();

      const result = await upvotes(prisma, { song_id: 'song1' });
      expect(result).toBe(0);
      expect(prisma.vote.count).not.toHaveBeenCalled();
    });
  });

  describe('downvotes', () => {
    it('should count downvotes matching the filter', async () => {
      const prisma = mockPrisma();
      (prisma.vote.count as jest.Mock).mockResolvedValue(1);

      const result = await downvotes(prisma, { user_id: 'user1' });
      expect(result).toBe(1);
      expect(prisma.vote.count).toHaveBeenCalledWith({
        where: { userId: 'user1', type: 'down' },
      });
    });
  });

  describe('topUsers', () => {
    it('should return top users sorted by net vote score', async () => {
      const prisma = mockPrisma();
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'u1', username: 'alice' },
        { id: 'u2', username: 'bob' },
        { id: 'u3', username: 'charlie' },
      ]);

      (prisma.vote.count as jest.Mock).mockImplementation(
        ({ where }: { where: { userId?: string; type?: string } }) => {
          const scores: Record<string, { up: number; down: number }> = {
            u1: { up: 2, down: 0 },
            u2: { up: 0, down: 1 },
            u3: { up: 3, down: 0 },
          };
          const userScores = scores[where.userId ?? ''] ?? { up: 0, down: 0 };
          if (where.type === 'up') return Promise.resolve(userScores.up);
          if (where.type === 'down') return Promise.resolve(userScores.down);
          return Promise.resolve(0);
        }
      );

      const result = await topUsers(prisma, 2);

      expect(result).toHaveLength(2);
      expect(result[0].user).toBe('charlie'); // score 3
      expect(result[1].user).toBe('alice'); // score 2
    });

    it('should show "unknown" for users without a username', async () => {
      const prisma = mockPrisma();
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1', username: null }]);

      const result = await topUsers(prisma, 10);
      expect(result[0].user).toBe('unknown');
    });
  });
});
