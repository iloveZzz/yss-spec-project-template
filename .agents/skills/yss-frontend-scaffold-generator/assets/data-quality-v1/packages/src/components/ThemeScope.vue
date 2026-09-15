<script setup lang="ts">
import { watchEffect } from 'vue';
import { theme } from 'ant-design-vue';
import { useThemeStore } from '@/store/theme';
const props = defineProps<{ container: HTMLElement }>();
const { token } = theme.useToken();
const store = useThemeStore();
// Runs inside ConfigProvider; Vue stops the watcher when this scope unmounts.
watchEffect(() => store.syncContainer(props.container, token.value));
</script>
<template><slot /></template>
