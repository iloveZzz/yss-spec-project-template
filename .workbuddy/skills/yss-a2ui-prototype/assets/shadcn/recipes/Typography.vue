<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'blockquote' | 'code' | 'small' }>(), { variant: 'p' })
const styles = {
  h1: 'text-4xl font-extrabold tracking-tight',
  h2: 'border-b pb-2 text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  p: 'leading-7', blockquote: 'border-l-2 pl-6 italic',
  code: 'rounded bg-muted px-1.5 py-1 font-mono text-sm', small: 'text-sm font-medium',
}
</script>

<template>
  <component :is="Object.hasOwn(styles, variant) ? variant : 'p'" :class="styles[variant]"><slot /></component>
</template>
