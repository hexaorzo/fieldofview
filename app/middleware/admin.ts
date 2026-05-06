export default defineNuxtRouteMiddleware(async () => {
  const { user, profile, ready, refreshSession } = useAuth()

  if (!ready.value) {
    await refreshSession()
  }

  if (!user.value) {
    return navigateTo('/auth/login')
  }

  if (!profile.value || profile.value.role !== 'admin') {
    return navigateTo('/')
  }
})

