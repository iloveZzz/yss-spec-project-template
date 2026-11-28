<script setup lang="ts">
import { CalendarRoot, useForwardPropsEmits, type CalendarRootProps, type CalendarRootEmits } from 'reka-ui'

const props = defineProps<CalendarRootProps>()
const emits = defineEmits<CalendarRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <!-- 选中日期与浏览月份独立透传，周/月布局及回焦仍由业务页面管理。 -->
  <CalendarRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </CalendarRoot>
</template>
