import { requireUser } from "../_lib/auth.js"
import { noContent, readJsonBody, withApi } from "../_lib/responses.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const body = await readJsonBody(req)
  const id = body.subscriptionId || body.id
  const { error } = await caller.from("subscriptions").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw error
  return noContent(res, requestId)
}, ["DELETE"])
