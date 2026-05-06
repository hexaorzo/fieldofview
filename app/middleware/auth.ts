export default defineNuxtRouteMiddleware(async () => {
  const { user, ready, refreshSession } = useAuth()

  if (!ready.value) {
    await refreshSession()
  }

  if (!user.value) {
    return navigateTo('/auth/login')
  }
})

