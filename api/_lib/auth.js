import { ApiRequestError } from "./responses.js"
import { createAuthClient, createCallerClient } from "./supabaseServer.js"

export function getBearerToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || ""
  if (!authorization.startsWith("Bearer ")) {
    throw new ApiRequestError("UNAUTHORIZED", "Please sign in to continue.", 401)
  }

  const token = authorization.slice("Bearer ".length).trim()
  if (!token) {
    throw new ApiRequestError("UNAUTHORIZED", "Please sign in to continue.", 401)
  }

  return token
}

export async function requireUser(req) {
  const token = getBearerToken(req)
  const authClient = createAuthClient()
  const { data, error } = await authClient.auth.getUser(token)

  if (error || !data?.user) {
    throw new ApiRequestError("UNAUTHORIZED", "Please sign in to continue.", 401)
  }

  return {
    token,
    user: data.user,
    caller: createCallerClient(token)
  }
}
