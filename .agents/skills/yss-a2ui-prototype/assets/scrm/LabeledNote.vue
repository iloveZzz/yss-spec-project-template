<script setup lang="ts">
import { useId } from 'vue'
import { Label } from '@/components/ui/label'
import CountedTextarea from './components/CountedTextarea.vue'

defineProps<{
  label: string
  modelValue: string
  maxLength: number
  readonly?: boolean
  disabled?: boolean
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
</script>

<template>
  <div class="grid min-w-0 gap-2">
    <Label :for="id">{{ label }}</Label>
    <CountedTextarea
      :id="id" :model-value="modelValue" :max-length="maxLength" :clear-label="label"
      :readonly="readonly" :disabled="disabled" @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>
