<script setup lang="ts">
import { useTemplateRef } from 'vue'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import FieldClearButton from './FieldClearButton.vue'
import { useClearNativeField } from './clear-native-field'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue: string
  maxLength: number
  disabled?: boolean
  readonly?: boolean
  clearLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
const control = useTemplateRef<{ $el: HTMLTextAreaElement }>('control')
const { clear, compositionListeners, controlKey, updateModel } = useClearNativeField(
  () => control.value?.$el,
  (next) => emit('update:modelValue', String(next)),
)
</script>

<template>
  <InputGroup :data-disabled="disabled || undefined" data-field-clear-scope>
    <InputGroupTextarea
      ref="control"
      :key="controlKey"
      v-bind="$attrs"
      v-on="compositionListeners"
      class="resize-none max-h-60 overflow-y-auto"
      :model-value="modelValue"
      :maxlength="maxLength"
      :disabled="disabled"
      :readonly="readonly"
      @update:model-value="updateModel"
    />
    <InputGroupAddon align="block-end" class="counted-textarea-meter">
      <FieldClearButton
        v-if="clearLabel && modelValue !== '' && !disabled && !readonly"
        :label="clearLabel"
        @clear="clear"
      />
      <InputGroupText>
        {{ modelValue.length }} / {{ maxLength }}
      </InputGroupText>
    </InputGroupAddon>
  </InputGroup>
</template>

<style scoped>
.counted-textarea-meter {
  justify-content: flex-end;
  padding: 2px var(--brand-size-xs) 6px;
  cursor: default;
  font-size: var(--yss-typography-caption-font-size);
  font-variant-numeric: tabular-nums;
}
</style>
