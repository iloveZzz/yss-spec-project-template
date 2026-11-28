<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '../button'
const props = defineProps<{ message: string }>()
</script>

<template>
  <Button type="button" @click="toast(props.message)"><slot /></Button>
</template>
