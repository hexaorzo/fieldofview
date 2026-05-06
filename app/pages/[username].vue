<script setup lang="ts">
const route = useRoute()
const { portfolioImage } = useMedia()
const { user } = useAuth()
const toast = useToast()

type Profile = {
  id: string
  username: string
  display_name: string | null
  about: string | null
  avatar_url: string | null
  profile_tags?: { tag_slug: string }[]
}

type Photo = {
  id: string
  image_path: string
  title: string | null
  description: string | null
  event_type?: string | null
  photo_tags?: { tag_slug: string }[]
}

const username = computed(() => route.params.username as string)

const { data, pending, error } = await useFetch<{ profile: Profile, photos: Photo[] }>(
  () => `/api/photographers/${encodeURIComponent(username.value)}`
)

const quoteState = reactive({
  category: '',
  budget: '',
  timeline: '',
  details: ''
})

const creating = ref(false)
const selectedPhoto = ref<Photo | null>(null)
const isPhotoModalOpen = ref(false)

function openPhoto(photo: Photo) {
  selectedPhoto.value = photo
  isPhotoModalOpen.value = true
}

const allPhotos = computed(() => data.value?.photos || [])

const selectedIndex = computed(() => {
  if (!selectedPhoto.value) return -1
  return allPhotos.value.findIndex(p => p.id === selectedPhoto.value?.id)
})

const hasPrev = computed(() => selectedIndex.value > 0)
const hasNext = computed(() => selectedIndex.value >= 0 && selectedIndex.value < allPhotos.value.length - 1)

function openPrev() {
  if (!hasPrev.value) return
  selectedPhoto.value = allPhotos.value[selectedIndex.value - 1] || null
}

function openNext() {
  if (!hasNext.value) return
  selectedPhoto.value = allPhotos.value[selectedIndex.value + 1] || null
}

function onKeydown(e: KeyboardEvent) {
  if (!isPhotoModalOpen.value) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    openPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    openNext()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    isPhotoModalOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

async function submitQuote() {
  if (!data.value?.profile?.id) return
  creating.value = true
  try {
    await $fetch('/api/quotes', {
      method: 'POST',
      body: {
        photographerProfileId: data.value.profile.id,
        category: quoteState.category,
        budget: quoteState.budget || undefined,
        timeline: quoteState.timeline || undefined,
        details: quoteState.details || undefined
      }
    })
    toast.add({ title: 'Quote requested', description: 'You can continue the conversation in your dashboard.' })
    await navigateTo('/dashboard')
  } catch (e: any) {
    toast.add({ title: 'Failed to request quote', description: e?.message ?? String(e), color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UPage>
    <UPageHeader
      :title="data?.profile?.display_name || data?.profile?.username || 'Photographer'"
      :description="data?.profile?.about || '@' + (data?.profile?.username || '')"
    />

    <UPageBody class="space-y-6">
      <UAlert v-if="error" color="error" variant="soft" title="Not found">
        {{ (error as any).message || error }}
      </UAlert>

      <UCard v-else>
        <div class="flex items-start gap-4">
          <UAvatar :src="portfolioImage(data?.profile?.avatar_url || null, 'avatar') || data?.profile?.avatar_url || undefined" :alt="data?.profile?.username" size="lg" />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-muted">@{{ data?.profile?.username }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge
                v-for="t in (data?.profile?.profile_tags || [])"
                :key="t.tag_slug"
                color="neutral"
                variant="soft"
              >
                {{ t.tag_slug }}
              </UBadge>
            </div>
          </div>
          <UButton to="#quote" icon="i-lucide-file-text" color="primary" variant="soft">
            Request a quote
          </UButton>
        </div>
      </UCard>

      <UCard id="quote">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold">Request a quote</p>
              <p class="text-sm text-muted">Send details to start a thread.</p>
            </div>
            <UButton v-if="!user" to="/auth/login" color="primary">Log in</UButton>
          </div>

          <UAlert v-if="!user" color="neutral" variant="soft" title="Log in required">
            Create an account (or log in) to request quotes and chat.
          </UAlert>

          <UForm v-else :state="quoteState" @submit.prevent="submitQuote">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Category">
                <UInput v-model="quoteState.category" placeholder="wedding, portrait, …" required />
              </UFormField>
              <UFormField label="Budget (optional)">
                <UInput v-model="quoteState.budget" placeholder="$1,500" />
              </UFormField>
              <UFormField label="Timeline (optional)">
                <UInput v-model="quoteState.timeline" placeholder="June 2026" />
              </UFormField>
              <div />
              <UFormField class="md:col-span-2" label="Details (optional)">
                <UTextarea v-model="quoteState.details" :rows="4" placeholder="Tell them what you’re looking for…" />
              </UFormField>
            </div>
            <div class="mt-5 flex flex-col items-start gap-2 border-t border-default/60 pt-4 sm:flex-row sm:items-center sm:gap-3">
              <UButton type="submit" color="primary" :loading="creating">Request quote</UButton>
              <p class="text-sm text-muted">This will create a chat thread.</p>
            </div>
          </UForm>
        </div>
      </UCard>

      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Portfolio</h2>
        <p v-if="pending" class="text-sm text-muted">Loading…</p>
      </div>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <UCard
          v-for="ph in data?.photos || []"
          :key="ph.id"
          class="group relative cursor-pointer p-0 overflow-hidden transition hover:shadow-md"
          @click="openPhoto(ph)"
        >
          <div class="aspect-[4/3] bg-muted/30">
            <img
              v-if="portfolioImage(ph.image_path, 'card')"
              :src="portfolioImage(ph.image_path, 'card')!"
              :alt="ph.title || 'Photo'"
              class="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            >
          </div>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2 opacity-0 transition group-hover:opacity-100">
            <p class="text-sm font-medium text-white">
              View details
            </p>
          </div>
          <div class="p-4 space-y-1">
            <p class="font-medium truncate">{{ ph.title || 'Untitled' }}</p>
            <p class="text-sm text-muted truncate">{{ ph.description || '' }}</p>
          </div>
        </UCard>
      </div>

      <UModal
        v-model:open="isPhotoModalOpen"
        :title="selectedPhoto?.title || 'Photo'"
        :description="selectedPhoto?.event_type || 'Portfolio photo'"
        class="max-h-[90vh] overflow-y-auto"
        scrollable
      >
        <template #content>
          <div v-if="selectedPhoto" class="space-y-5 p-4 sm:p-6">
            <div class="relative max-h-[72vh] overflow-hidden rounded-lg bg-muted/30">
              <img
                v-if="portfolioImage(selectedPhoto.image_path, 'full')"
                :src="portfolioImage(selectedPhoto.image_path, 'full')!"
                :alt="selectedPhoto.title || 'Photo'"
                class="max-h-[72vh] w-full object-contain"
                decoding="async"
              >
              <div class="pointer-events-none absolute inset-x-0 bottom-2 hidden items-center justify-center sm:flex">
                <p class="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  Use ← / → to browse
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-arrow-left"
                :disabled="!hasPrev"
                @click="openPrev()"
              >
                Previous
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                trailing-icon="i-lucide-arrow-right"
                :disabled="!hasNext"
                @click="openNext()"
              >
                Next
              </UButton>
            </div>

            <div class="space-y-2">
              <p class="text-sm text-muted">
                {{ selectedPhoto.description || 'No description provided.' }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="t in (selectedPhoto.photo_tags || [])"
                  :key="t.tag_slug"
                  color="neutral"
                  variant="subtle"
                >
                  {{ t.tag_slug }}
                </UBadge>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </UPageBody>
  </UPage>
</template>

