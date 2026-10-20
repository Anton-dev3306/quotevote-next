import { graphql } from 'graphql';
import { schema } from '~/data/schema';
// Alias ​​+ fragment used intentionally: authorization should not depend on how the query is written
const source = `
  query {
    bots: getBotReportedUsers(sortBy: "botReports", limit: 10) {
      ...BotFields
    }
  }
  fragment BotFields on User {
    _id
    username
  }
`;

type TestUser = { _id: string; admin: boolean };

function buildContext(user: TestUser | null) {
  const findMany = jest.fn().mockResolvedValue([]);
  return {
    findMany,
    contextValue: {
      user,
      userId: user?._id ?? null,
      prisma: { user: { findMany } },
    },
  };
}

type RejectedCase = { label: string; user: TestUser | null; code: string };

const rejectedCases: RejectedCase[] = [
  { label: 'a signed-out caller', user: null, code: 'UNAUTHENTICATED' },
  { label: 'a non-admin member', user: { _id: 'member-1', admin: false }, code: 'FORBIDDEN' },
];

describe('getBotReportedUsers authorization (executable schema)', () => {
  it.each(rejectedCases)('rejects $label without reading users', async ({ user, code }) => {
    const { findMany, contextValue } = buildContext(user);

    const result = await graphql({ schema, source, contextValue });

    expect(result.errors?.[0].extensions?.code).toBe(code);
    expect(result.data).toEqual({ bots: null });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('lets an admin read the bot-reported list through the intended query', async () => {
    const { findMany, contextValue } = buildContext({ _id: 'admin-1', admin: true });

    const result = await graphql({ schema, source, contextValue });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ bots: [] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });
});