import { z } from 'zod'
import { requireUser } from '../utils/auth'

const BodySchema = z.object({
  photographerProfileId: z.string().min(1),
  category: z.string().min(1).max(80),
  budget: z.string().max(80).optional(),
  timeline: z.string().max(120).optional(),
  details: z.string().max(2000).optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))

  const { data: reqRow, error: reqErr } = await supabase
    .from('quote_requests')
    .insert({
      photographer_profile_id: body.photographerProfileId,
      client_user_id: user.id,
      category: body.category,
      budget: body.budget ?? null,
      timeline: body.timeline ?? null,
      details: body.details ?? null,
      status: 'new'
    })
    .select('*')
    .single()

  if (reqErr) throw createError({ statusCode: 500, statusMessage: reqErr.message })

  const { data: threadRow, error: threadErr } = await supabase
    .from('quote_threads')
    .insert({
      quote_request_id: reqRow.id,
      photographer_profile_id: body.photographerProfileId,
      client_user_id: user.id
    })
    .select('*')
    .single()

  if (threadErr) throw createError({ statusCode: 500, statusMessage: threadErr.message })

  if (body.details) {
    const { error: msgErr } = await supabase.from('quote_messages').insert({
      thread_id: threadRow.id,
      sender_user_id: user.id,
      body: body.details
    })
    if (msgErr) throw createError({ statusCode: 500, statusMessage: msgErr.message })
  }

  return { quoteRequest: reqRow, thread: threadRow }
})

