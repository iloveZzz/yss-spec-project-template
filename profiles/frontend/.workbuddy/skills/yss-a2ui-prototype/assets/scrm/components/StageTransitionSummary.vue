<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'

defineProps<{
  fromLabel: string
  fromStatus?: string
  toLabel: string
  toTone?: 'stage' | 'success' | 'danger' | 'neutral'
  reopenHint?: string
  hint?: string
}>()
</script>

<template>
  <section class="crm-stage-transition" aria-label="阶段流转预览">
    <div class="crm-stage-transition-flow">
      <span class="crm-stage-pill">
        <span>{{ fromLabel }}</span>
        <span v-if="fromStatus" class="crm-stage-pill-sub">· {{ fromStatus }}</span>
      </span>
      <ArrowRight class="crm-stage-transition-arrow" aria-hidden="true" />
      <span class="crm-stage-pill" :data-tone="toTone ?? 'stage'">{{ toLabel }}</span>
    </div>
    <p v-if="reopenHint" class="crm-stage-transition-reopen" role="status">{{ reopenHint }}</p>
    <p v-if="hint" class="crm-stage-transition-hint">{{ hint }}</p>
  </section>
</template>
