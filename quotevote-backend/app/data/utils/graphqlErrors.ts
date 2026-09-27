import { GraphQLError } from 'graphql';
import { RoomAccessDeniedError, RoomNotFoundError } from '~/types/roomAccess';
import { logger } from './logger';
export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof RoomNotFoundError) {
    return new GraphQLError(error.message, { extensions: { code: 'NOT_FOUND' } });
  }

  if (error instanceof RoomAccessDeniedError) {
    return new GraphQLError(error.message, { extensions: { code: 'FORBIDDEN' } });
  }

  logger.error('Unexpected error in room access check', { error });
  return new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}