<script setup lang="ts">
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import { ChartContainer } from './index'

const props = defineProps<{ label: string; rows: { label: string; value: number }[] }>()
const x = (_: unknown, index: number) => index
const y = (row: { value: number }) => row.value
</script>

<template>
  <figure class="w-full min-w-0">
    <figcaption class="mb-3 text-sm font-medium">{{ label }}</figcaption>
    <ChartContainer :config="{ value: { label, color: 'var(--primary)' } }" class="h-48 w-full">
      <VisXYContainer :data="props.rows" :y-domain="[0, undefined]">
        <VisGroupedBar :x="x" :y="y" color="var(--primary)" />
        <VisAxis type="x" :tick-values="rows.map((_, i) => i)" :tick-format="(v: number) => rows[v]?.label ?? ''" />
      </VisXYContainer>
    </ChartContainer>
    <ul class="sr-only"><li v-for="row in rows" :key="row.label">{{ row.label }} {{ row.value }}</li></ul>
  </figure>
</template>
