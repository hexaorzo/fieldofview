export default defineNuxtRouteMiddleware(async () => {
  const { user, profile, ready, refreshSession } = useAuth()

  if (!ready.value) {
    await refreshSession()
  }

  if (!user.value) {
    return navigateTo('/auth/login')
  }

  if (!profile.value || profile.value.role !== 'photographer') {
    return navigateTo('/')
  }

  if (profile.value.moderation_status !== 'approved') {
    return navigateTo('/dashboard')
  }
})

