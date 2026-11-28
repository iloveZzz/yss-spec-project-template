<script setup lang="ts">
import { RangeCalendarRoot, useForwardPropsEmits, type RangeCalendarRootProps, type RangeCalendarRootEmits } from 'reka-ui'

const props = defineProps<RangeCalendarRootProps>()
const emits = defineEmits<RangeCalendarRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <!-- 只透传日期契约和 scoped slot，让调用方保留输入焦点、月份布局与业务状态。 -->
  <RangeCalendarRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </RangeCalendarRoot>
</template>
