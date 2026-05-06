<script setup lang="ts">
const { signIn, user } = useAuth()
const toast = useToast()

const state = reactive({
  email: '',
  password: ''
})

watchEffect(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})

async function onSubmit() {
  try {
    await signIn({ email: state.email, password: state.password })
    toast.add({ title: 'Logged in' })
    await navigateTo('/dashboard')
  } catch (e: any) {
    toast.add({ title: 'Login failed', description: e?.message ?? String(e), color: 'error' })
  }
}
</script>

<template>
  <UPage>
    <UPageHeader title="Log in" />
    <UPageBody class="flex justify-center">
      <UCard class="w-full max-w-md">
        <UForm :state="state" @submit.prevent="onSubmit">
          <div class="space-y-5">
            <UFormField label="Email">
              <UInput v-model="state.email" type="email" autocomplete="email" required />
            </UFormField>
            <UFormField label="Password">
              <UInput v-model="state.password" type="password" autocomplete="current-password" required />
            </UFormField>
            <div class="flex items-center justify-between gap-3">
              <UButton type="submit" color="primary">Log in</UButton>
              <UButton to="/auth/forgot" color="neutral" variant="ghost">Forgot?</UButton>
            </div>
            <p class="border-t border-default/60 pt-3 text-sm text-muted">
              No account?
              <NuxtLink to="/auth/register" class="underline underline-offset-2">Create one</NuxtLink>
            </p>
          </div>
        </UForm>
      </UCard>
    </UPageBody>
  </UPage>
</template>

