import { z } from 'zod'
import { requireUser, getProfileByUserId } from '../../utils/auth'

const ParamsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const { id } = ParamsSchema.parse(event.context.params || {})

  const profile = await getProfileByUserId(event, user.id)

  const { data: thread, error: threadErr } = await supabase
    .from('quote_threads')
    .select('id,quote_request_id,photographer_profile_id,client_user_id,created_at,quote_request:quote_requests!quote_threads_quote_request_id_fkey(status,category,budget,timeline),photographer:profiles!quote_threads_photographer_profile_id_fkey(username,display_name,avatar_url)')
    .eq('id', id)
    .single()

  if (threadErr) throw createError({ statusCode: 500, statusMessage: threadErr.message })

  const isMember = thread.client_user_id === user.id || (profile?.id && thread.photographer_profile_id === profile.id)
  if (!isMember) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { data: messages, error: msgErr } = await supabase
    .from('quote_messages')
    .select('id,thread_id,sender_user_id,body,created_at')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (msgErr) throw createError({ statusCode: 500, statusMessage: msgErr.message })

  return { thread, messages: messages ?? [] }
})

