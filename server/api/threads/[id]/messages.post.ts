import { z } from 'zod'
import { requireUser, getProfileByUserId } from '../../../utils/auth'

const ParamsSchema = z.object({ id: z.string().min(1) })
const BodySchema = z.object({ body: z.string().min(1).max(2000) })

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const { id } = ParamsSchema.parse(event.context.params || {})
  const body = BodySchema.parse(await readBody(event))

  const profile = await getProfileByUserId(event, user.id)

  const { data: thread, error: threadErr } = await supabase
    .from('quote_threads')
    .select('id,photographer_profile_id,client_user_id')
    .eq('id', id)
    .single()

  if (threadErr) throw createError({ statusCode: 500, statusMessage: threadErr.message })

  const isMember = thread.client_user_id === user.id || (profile?.id && thread.photographer_profile_id === profile.id)
  if (!isMember) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { data: msg, error: msgErr } = await supabase
    .from('quote_messages')
    .insert({
      thread_id: id,
      sender_user_id: user.id,
      body: body.body
    })
    .select('id,thread_id,sender_user_id,body,created_at')
    .single()

  if (msgErr) throw createError({ statusCode: 500, statusMessage: msgErr.message })
  return { message: msg }
})

