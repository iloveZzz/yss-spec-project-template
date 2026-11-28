<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{ label?: string }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <button
    type="button"
    data-slot="field-clear"
    :aria-label="label ? `清空${label}` : '清空此字段'"
    :title="label ? `清空${label}` : '清空此字段'"
    @pointerdown.stop
    @mousedown.prevent
    @click.stop="emit('clear')"
  >
    <span aria-hidden="true"><X /></span>
  </button>
</template>

<style scoped>
button[data-slot='field-clear'] {
  display: inline-grid;
  flex: none;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  border-radius: var(--yss-rounded-sm);
  background: transparent;
  color: var(--yss-colors-text-tertiary);
  cursor: pointer;
}

button[data-slot='field-clear']:disabled {
  display: none;
}

button[data-slot='field-clear']:is(:hover, :active) {
  color: var(--yss-colors-text-primary, var(--yss-colors-text));
}

button[data-slot='field-clear']:focus-visible {
  outline: 2px solid var(--yss-colors-primary-control);
  outline-offset: -2px;
}

span {
  display: grid;
  place-items: center;
  inline-size: 14px;
  block-size: 14px;
  border-radius: 50%;
  background: currentColor;
}

span > svg {
  inline-size: 10px;
  block-size: 10px;
  color: var(--yss-colors-surface-elevated);
  stroke-width: 2.5;
}

@media (pointer: coarse), (width < 720px) {
  button[data-slot='field-clear'] {
    inline-size: 36px;
    block-size: 36px;
  }
}

@media (forced-colors: active) {
  span {
    forced-color-adjust: none;
    background: ButtonText;
  }

  span > svg {
    color: ButtonFace;
  }

  button[data-slot='field-clear']:focus-visible {
    outline-color: Highlight;
  }
}
</style>

<style>
@layer components {
  [data-field-clear-scope] button[data-slot='field-clear'] {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity var(--brand-motion-duration-fast, 100ms) ease,
      visibility 0s linear var(--brand-motion-duration-fast, 100ms),
      color var(--brand-motion-duration-fast, 100ms) ease;
  }

  [data-field-clear-scope]:is(:focus-within, [data-field-clear-open='true'])
    button[data-slot='field-clear'],
  [data-field-clear-scope] button[data-slot='field-clear']:is(:focus-visible, :active) {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition:
      opacity var(--brand-motion-duration-fast, 100ms) ease,
      visibility 0s linear 0s,
      color var(--brand-motion-duration-fast, 100ms) ease;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-field-clear-scope] button[data-slot='field-clear'],
    [data-field-clear-scope]:is(:focus-within, [data-field-clear-open='true'])
      button[data-slot='field-clear'],
    [data-field-clear-scope] button[data-slot='field-clear']:is(:focus-visible, :active) {
      transition: none;
    }
  }
}
</style>
