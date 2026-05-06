<template>
  <div class="space-y-10">
    <UPageHero
      title="Find the right photographer"
      description="Browse portfolios, filter by tags and event type, then request a quote and chat directly in-app."
      :links="[{
        label: 'Browse photographers',
        to: '/photographers',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: 'Explore photos',
        to: '/photos',
        icon: 'i-lucide-images',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageSection
      title="Built-in quote + chat workflow"
      description="Clients request quotes, photographers reply, and both sides keep the conversation in one place."
      :features="[{
        icon: 'i-lucide-search',
        title: 'Discovery',
        description: 'Browse photographers and photos with filters.'
      }, {
        icon: 'i-lucide-file-text',
        title: 'Quotes',
        description: 'Request quotes with budget, timeline, and event details.'
      }, {
        icon: 'i-lucide-messages-square',
        title: 'Chat',
        description: 'Threaded messaging connected to every quote.'
      }]"
    />
  </div>
</template>
