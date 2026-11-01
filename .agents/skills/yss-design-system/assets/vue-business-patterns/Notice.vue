<script setup lang="ts">
import { Alert, AlertDescription } from '@/components/ui/alert'
defineProps<{error?:boolean}>()
</script>
<template><Alert :role="error?'alert':'status'" :class="['notice',{error}]"><AlertDescription><slot/></AlertDescription></Alert></template>
