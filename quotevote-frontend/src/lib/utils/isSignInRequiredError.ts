import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors'

const hasUnauthenticatedCode = (errors: unknown): boolean =>
  Array.isArray(errors) &&
  errors.some(
    (err) => (err as { extensions?: { code?: unknown } })?.extensions?.code === 'UNAUTHENTICATED'
  )

/**
 * True when the API refused a request because it needs a signed-in user. The
 * legacy API refuses with HTTP 400, which Apollo reports as a ServerError carrying
 * the GraphQL errors in its body; resolver-level refusals arrive as GraphQL errors.
 */
export function isSignInRequiredError(error: unknown): boolean {
  if (CombinedGraphQLErrors.is(error)) return hasUnauthenticatedCode(error.errors)
  if (ServerError.is(error)) {
    try {
      return hasUnauthenticatedCode((JSON.parse(error.bodyText) as { errors?: unknown }).errors)
    } catch {
      return false
    }
  }
  return false
}
