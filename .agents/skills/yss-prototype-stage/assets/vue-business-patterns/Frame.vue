<script setup lang="ts">
import Workspace from './Workspace.vue'
import { singlePageDefinition } from './workspace'
const props = defineProps<{ page: any; title: string }>()
const definition = singlePageDefinition(props.page, props.title)
</script>
<template><Workspace :definition="definition"/></template>
