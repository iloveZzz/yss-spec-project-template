<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseDate } from '@internationalized/date'
import { Button } from '../button'
import { Calendar } from '../calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

const props = withDefaults(defineProps<{ modelValue?: string; label?: string; disabled?: boolean }>(), { label: '选择日期' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const date = computed(() => props.modelValue ? parseDate(props.modelValue) : undefined)
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline" :disabled="disabled" :aria-label="label">{{ modelValue || label }}</Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar :model-value="date" locale="zh-CN" initial-focus @update:model-value="value => {
        if (value && !Array.isArray(value)) { emit('update:modelValue', value.toString()); open = false }
      }" />
    </PopoverContent>
  </Popover>
</template>
