<script setup lang="ts">
const route = useRoute()
const { mediaUrl, portfolioImage } = useMedia()

const q = computed(() => (route.query.q as string | undefined) || '')
const tag = computed(() => (route.query.tag as string | undefined) || '')
const sort = computed(() => (route.query.sort as string | undefined) || 'newest')
const page = computed(() => {
  const parsed = Number(route.query.page || 1)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' }
]

type Photographer = {
  id: string
  username: string
  display_name: string | null
  about: string | null
  avatar_url: string | null
  profile_tags?: { tag_slug: string }[]
}

type TagItem = { slug: string, label: string }

type Response = {
  items: Photographer[]
  page: number
  pageSize: number
  total: number
}

const { data: tagData } = await useFetch<{ items: TagItem[] }>('/api/tags')

const { data, pending, error, refresh } = await useFetch<Response>('/api/photographers', {
  query: computed(() => ({
    q: q.value || undefined,
    tag: tag.value || undefined,
    sort: sort.value,
    page: page.value,
    pageSize: 12
  }))
})

function setQuery(next: Record<string, any>) {
  return navigateTo({ query: { ...route.query, ...next } })
}

const availableTags = computed(() => tagData.value?.items || [])

const activeFilters = computed(() => {
  const chips: { key: string, label: string, clear: () => unknown }[] = []
  if (q.value) {
    chips.push({ key: 'q', label: `Search: ${q.value}`, clear: () => setQuery({ q: undefined, page: 1 }) })
  }
  if (tag.value) {
    chips.push({ key: 'tag', label: `Tag: ${tag.value}`, clear: () => setQuery({ tag: undefined, page: 1 }) })
  }
  if (sort.value !== 'newest') {
    const label = sortOptions.find(option => option.value === sort.value)?.label || sort.value
    chips.push({ key: 'sort', label: `Sort: ${label}`, clear: () => setQuery({ sort: 'newest', page: 1 }) })
  }
  return chips
})

function clearAllFilters() {
  return navigateTo({ query: { page: 1 } })
}
</script>

<template>
  <UPage>
    <UPageHeader title="Photographers" description="Browse approved photographer profiles." />

    <UPageBody class="space-y-6">
      <UCard>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
          <UFormField label="Search" class="w-full md:col-span-2">
            <UInput
              :model-value="q"
              placeholder="Username or name…"
              icon="i-lucide-search"
              @update:model-value="(v) => setQuery({ q: v || undefined, page: 1 })"
            />
          </UFormField>

          <UFormField label="Tag" class="w-full">
            <USelect
              :model-value="tag || undefined"
              :items="availableTags.map((item) => item.slug)"
              placeholder="Any tag"
              icon="i-lucide-tag"
              @update:model-value="(v) => setQuery({ tag: v || undefined, page: 1 })"
            />
          </UFormField>

          <UFormField label="Sort" class="w-full">
            <USelect
              :model-value="sort"
              :items="sortOptions"
              value-key="value"
              label-key="label"
              icon="i-lucide-arrow-up-down"
              @update:model-value="(v) => setQuery({ sort: v || 'newest', page: 1 })"
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

            <div class="flex items-center gap-2">
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

      <div v-if="pending" class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <USkeleton v-for="n in 6" :key="n" class="h-36" />
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard v-for="p in data?.items || []" :key="p.id" class="hover:shadow-sm transition">
          <div class="flex items-start gap-3">
            <UAvatar :src="mediaUrl(p.avatar_url, 'portfolio', { width: 120, height: 120, resize: 'cover', quality: 75 }) || portfolioImage(p.avatar_url, 'avatar') || undefined" :alt="p.username" size="md" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold truncate">
                    {{ p.display_name || p.username }}
                  </p>
                  <p class="text-sm text-muted truncate">@{{ p.username }}</p>
                </div>
                <UButton :to="`/${p.username}`" color="primary" variant="soft" size="sm">
                  View
                </UButton>
              </div>
              <p class="mt-2 text-sm text-muted line-clamp-2">
                {{ p.about || '—' }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <UBadge
                  v-for="t in (p.profile_tags || []).slice(0, 3)"
                  :key="t.tag_slug"
                  color="neutral"
                  variant="soft"
                >
                  {{ t.tag_slug }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </div>

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

