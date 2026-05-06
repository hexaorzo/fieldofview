<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Photographer Platform'
const description = 'Discover photographers, explore portfolios, and request quotes with in-app chat.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

const { user, profile, signOut } = useAuth()
</script>

<template>
  <UApp>
    <UHeader class="border-b border-default/60">
      <template #left>
        <div class="flex items-center gap-4 py-1">
          <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-camera" class="size-5" />
            <span>Photographer Platform</span>
          </NuxtLink>

          <UNavigationMenu
            class="hidden md:flex"
            :items="[
              { label: 'Photographers', to: '/photographers' },
              { label: 'Photos', to: '/photos' }
            ]"
          />
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-1.5 py-1 sm:gap-2">
          <UColorModeButton />

          <UButton v-if="user" to="/dashboard" icon="i-lucide-layout-dashboard" color="neutral" variant="ghost">
            Dashboard
          </UButton>
          <UButton v-if="profile?.role === 'photographer'" to="/dashboard/portfolio" icon="i-lucide-images" color="neutral" variant="ghost">
            Portfolio
          </UButton>
          <UButton v-if="profile?.role === 'admin'" to="/admin" icon="i-lucide-shield" color="neutral" variant="ghost">
            Admin
          </UButton>
          <UButton v-if="!user" to="/auth/login" color="primary" variant="soft">
            Log in
          </UButton>
          <UButton v-if="!user" to="/auth/register" color="neutral" variant="outline">
            Create account
          </UButton>
          <UButton v-if="user" color="neutral" variant="ghost" icon="i-lucide-log-out" @click="signOut()">
            Sign out
          </UButton>
        </div>
      </template>
    </UHeader>

    <UMain class="py-6 sm:py-8">
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <NuxtPage />
      </div>
    </UMain>

    <USeparator icon="i-lucide-camera" />

    <UFooter class="py-2">
      <template #left>
        <p class="text-sm text-muted">
          © {{ new Date().getFullYear() }} Photographer Platform
        </p>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <UButton to="/photographers" color="neutral" variant="ghost">Browse</UButton>
        </div>
      </template>
    </UFooter>
  </UApp>
</template>
