<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Info } from '@lucide/vue'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    tone?: 'info' | 'neutral' | 'warning'
    class?: HTMLAttributes['class']
  }>(),
  {
    tone: 'info',
  },
)
</script>

<template>
  <div :class="cn('crm-form-callout', $props.class)" :data-tone="tone" role="note">
    <Info class="crm-form-callout-icon" aria-hidden="true" />
    <div class="crm-form-callout-body">
      <slot />
    </div>
  </div>
</template>
