<script setup lang="ts">
const route = useRoute()
const { portfolioImage } = useMedia()

const q = computed(() => (route.query.q as string | undefined) || '')
const tag = computed(() => (route.query.tag as string | undefined) || '')
const eventType = computed(() => (route.query.event as string | undefined) || '')
const sort = computed(() => (route.query.sort as string | undefined) || 'featured')
const page = computed(() => {
  const parsed = Number(route.query.page || 1)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const sortOptions = [
  { label: 'Featured first', value: 'featured' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' }
]

type TagItem = { slug: string, label: string }

type PhotoItem = {
  id: string
  image_path: string
  title: string | null
  description: string | null
  event_type: string | null
  profiles?: {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
  photo_tags?: { tag_slug: string }[]
}

type Response = {
  items: PhotoItem[]
  page: number
  pageSize: number
  total: number
}

const { data, pending, error, refresh } = await useFetch<Response>('/api/photos', {
  query: computed(() => ({
    q: q.value || undefined,
    tag: tag.value || undefined,
    event: eventType.value || undefined,
    sort: sort.value,
    page: page.value,
    pageSize: 24
  }))
})

const { data: tagData } = await useFetch<{ items: TagItem[] }>('/api/tags')

function setQuery(next: Record<string, any>) {
  return navigateTo({ query: { ...route.query, ...next } })
}

const availableTags = computed(() => tagData.value?.items || [])

const activeFilters = computed(() => {
  const chips: { key: string, label: string, clear: () => unknown }[] = []
  if (q.value) chips.push({ key: 'q', label: `Search: ${q.value}`, clear: () => setQuery({ q: undefined, page: 1 }) })
  if (eventType.value) chips.push({ key: 'event', label: `Event: ${eventType.value}`, clear: () => setQuery({ event: undefined, page: 1 }) })
  if (tag.value) chips.push({ key: 'tag', label: `Tag: ${tag.value}`, clear: () => setQuery({ tag: undefined, page: 1 }) })
  if (sort.value !== 'featured') {
    const label = sortOptions.find(option => option.value === sort.value)?.label || sort.value
    chips.push({ key: 'sort', label: `Sort: ${label}`, clear: () => setQuery({ sort: 'featured', page: 1 }) })
  }
  return chips
})

function clearAllFilters() {
  return navigateTo({ query: { page: 1 } })
}

const selectedPhoto = ref<PhotoItem | null>(null)
const isPhotoModalOpen = ref(false)

function openPhoto(photo: PhotoItem) {
  selectedPhoto.value = photo
  isPhotoModalOpen.value = true
}

const allPhotos = computed(() => data.value?.items || [])

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
</script>

<template>
  <UPage>
    <UPageHeader title="Photos" description="Cross-photographer feed of public portfolio photos." />

    <UPageBody class="space-y-6">
      <UCard>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
          <UFormField label="Search" class="w-full">
            <UInput
              :model-value="q"
              placeholder="Title or description…"
              icon="i-lucide-search"
              @update:model-value="(v) => setQuery({ q: v || undefined, page: 1 })"
            />
          </UFormField>

          <UFormField label="Tag" class="w-full">
            <USelect
              :model-value="tag || undefined"
              :items="availableTags.map((item) => item.slug)"
              placeholder="Any tag"
              icon="i-lucide-hash"
              @update:model-value="(v) => setQuery({ tag: v || undefined, page: 1 })"
            />
          </UFormField>

          <UFormField label="Event type" class="w-full">
            <UInput
              :model-value="eventType"
              placeholder="wedding, portrait, …"
              icon="i-lucide-tag"
              @update:model-value="(v) => setQuery({ event: v || undefined, page: 1 })"
            />
          </UFormField>

          <UFormField label="Sort" class="w-full">
            <USelect
              :model-value="sort"
              :items="sortOptions"
              value-key="value"
              label-key="label"
              icon="i-lucide-arrow-up-down"
              @update:model-value="(v) => setQuery({ sort: v || 'featured', page: 1 })"
            />
          </UFormField>

          <div class="md:col-span-4 flex flex-wrap items-center justify-between gap-2 border-t border-default/60 pt-3">
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-for="chip in activeFilters"
                :key="chip.key"
                color="neutral"
                variant="subtle"
                size="xs"
                trailing-icon="i-lucide-x"
                @click="chip.clear()"
              >
                {{ chip.label }}
              </UButton>
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                v-if="activeFilters.length"
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-eraser"
                @click="clearAllFilters()"
              >
                Clear all
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="pending"
                @click="refresh()"
              >
                Refresh
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UAlert v-if="error" color="error" variant="soft" title="Failed to load">
        {{ (error as any).message || error }}
      </UAlert>

      <div v-if="pending" class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <USkeleton v-for="n in 12" :key="n" class="h-40" />
      </div>

      <div v-else class="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [column-fill:_balance]">
        <div v-for="ph in data?.items || []" :key="ph.id" class="mb-4 break-inside-avoid">
          <UCard
            class="group relative p-0 overflow-hidden cursor-pointer transition hover:shadow-md"
            @click="openPhoto(ph)"
          >
            <div class="bg-muted/30">
              <img
                v-if="portfolioImage(ph.image_path, 'masonry')"
                :src="portfolioImage(ph.image_path, 'masonry')!"
                :alt="ph.title || 'Photo'"
                class="block h-auto w-full"
                loading="lazy"
                decoding="async"
              >
            </div>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2 opacity-0 transition group-hover:opacity-100">
              <p class="text-sm font-medium text-white">
                View details
              </p>
            </div>
            <div class="p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium truncate">
                  {{ ph.title || 'Untitled' }}
                </p>
                <UBadge v-if="ph.event_type" color="neutral" variant="soft">
                  {{ ph.event_type }}
                </UBadge>
              </div>
              <p class="text-sm text-muted truncate">
                by
                {{ ph.profiles?.display_name || ph.profiles?.username || '—' }}
              </p>
              <div class="flex flex-wrap gap-1 pt-1">
                <UBadge
                  v-for="t in (ph.photo_tags || []).slice(0, 3)"
                  :key="t.tag_slug"
                  color="neutral"
                  variant="soft"
                  size="sm"
                >
                  {{ t.tag_slug }}
                </UBadge>
              </div>
            </div>
          </UCard>
        </div>
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

            <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div class="space-y-2">
                <p class="text-sm text-muted">
                  {{ selectedPhoto.description || 'No description provided.' }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <UBadge v-if="selectedPhoto.event_type" color="neutral" variant="soft">
                    {{ selectedPhoto.event_type }}
                  </UBadge>
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

              <UCard class="md:min-w-60">
                <div class="space-y-2">
                  <p class="text-xs uppercase tracking-wide text-muted">Photographer</p>
                  <p class="font-medium">
                    {{ selectedPhoto.profiles?.display_name || selectedPhoto.profiles?.username || '—' }}
                  </p>
                  <UButton
                    v-if="selectedPhoto.profiles?.username"
                    :to="`/${selectedPhoto.profiles.username}`"
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-external-link"
                  >
                    View profile
                  </UButton>
                </div>
              </UCard>
            </div>
          </div>
        </template>
      </UModal>

      <div class="flex items-center justify-between">
        <p class="text-sm text-muted">
          {{ data?.total || 0 }} total
        </p>
        <UPagination
          v-if="data"
          :page="data.page"
          :items-per-page="data.pageSize"
          :total="data.total"
          @update:page="(p) => setQuery({ page: p })"
        />
      </div>
    </UPageBody>
  </UPage>
</template>

