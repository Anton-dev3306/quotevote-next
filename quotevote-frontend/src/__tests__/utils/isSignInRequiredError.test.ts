import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { isSignInRequiredError } from "@/lib/utils/isSignInRequiredError";

const serverError = (status: number, bodyText: string) =>
  new ServerError(`Response not successful: Received status code ${status}`, {
    response: { status } as Response,
    bodyText,
  });

describe("isSignInRequiredError", () => {
  it("recognises the legacy API's HTTP 400 refusal", () => {
    const body = JSON.stringify({
      errors: [{ message: "Auth token not found", extensions: { code: "UNAUTHENTICATED" } }],
    });
    expect(isSignInRequiredError(serverError(400, body))).toBe(true);
  });

  it("recognises a refusal reported as a GraphQL error", () => {
    const error = new CombinedGraphQLErrors({
      errors: [{ message: "Authentication required", extensions: { code: "UNAUTHENTICATED" } }],
    });
    expect(isSignInRequiredError(error)).toBe(true);
  });

  it("ignores other errors", () => {
    const other = new CombinedGraphQLErrors({
      errors: [{ message: "Invalid user_id", extensions: { code: "BAD_USER_INPUT" } }],
    });
    expect(isSignInRequiredError(other)).toBe(false);
    expect(isSignInRequiredError(serverError(500, "<html>Bad gateway</html>"))).toBe(false);
    expect(isSignInRequiredError(new Error("Network error"))).toBe(false);
    expect(isSignInRequiredError(undefined)).toBe(false);
  });
});
