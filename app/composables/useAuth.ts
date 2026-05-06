import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

export type ProfileRole = 'visitor' | 'photographer' | 'admin'
export type ModerationStatus = 'pending' | 'approved' | 'suspended'

export type Profile = {
  id: string
  user_id: string
  username: string
  display_name: string | null
  about: string | null
  avatar_url: string | null
  role: ProfileRole
  moderation_status: ModerationStatus
}

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/i, 'Use letters, numbers, underscore'),
  displayName: z.string().min(1).max(80).optional()
})

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export function useAuth() {
  const supabase = useSupabase()

  const user = useState<User | null>('auth:user', () => null)
  const profile = useState<Profile | null>('auth:profile', () => null)
  const ready = useState<boolean>('auth:ready', () => false)

  async function refreshSession() {
    const { data } = await supabase.auth.getUser()
    user.value = data.user ?? null

    if (!user.value) {
      profile.value = null
      ready.value = true
      return
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id,user_id,username,display_name,about,avatar_url,role,moderation_status')
      .eq('user_id', user.value.id)
      .maybeSingle()

    profile.value = (profileRow as Profile | null) ?? null
    ready.value = true
  }

  async function signIn(input: z.infer<typeof SignInSchema>) {
    const parsed = SignInSchema.parse(input)
    const { error } = await supabase.auth.signInWithPassword(parsed)
    if (error) throw error
    await refreshSession()
  }

  async function signUp(input: z.infer<typeof SignUpSchema>) {
    const parsed = SignUpSchema.parse(input)

    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password
    })
    if (error) throw error

    const createdUserId = data.user?.id
    if (createdUserId) {
      await supabase.from('profiles').insert({
        user_id: createdUserId,
        username: parsed.username,
        display_name: parsed.displayName ?? null,
        role: 'photographer',
        moderation_status: 'pending'
      })
    }

    await refreshSession()
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    ready.value = true
  }

  if (import.meta.client) {
    supabase.auth.onAuthStateChange(() => {
      refreshSession().catch(() => {})
    })
  }

  return {
    user,
    profile,
    ready,
    refreshSession,
    signIn,
    signUp,
    signOut
  }
}

