import { requireUser } from "./_lib/auth.js"
import { ApiRequestError, noContent, readJsonBody, withApi } from "./_lib/responses.js"
import { createAdminClient } from "./_lib/supabaseServer.js"

export function assertDeletePhrase(value) {
  if (value !== "DELETE") {
    throw new ApiRequestError("DELETE_CONFIRMATION_REQUIRED", "Type DELETE to confirm account deletion.", 400)
  }
  return true
}

export function pickVerifiedUserId(user) {
  return user.id
}

export default withApi(async (req, res, requestId) => {
  const { user } = await requireUser(req)
  const body = await readJsonBody(req)
  assertDeletePhrase(body.confirmation)

  const { error } = await createAdminClient().auth.admin.deleteUser(pickVerifiedUserId(user))
  if (error) throw error

  return noContent(res, requestId)
}, ["DELETE"])
