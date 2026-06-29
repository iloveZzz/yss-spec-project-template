<script setup lang="ts">
import { YButton } from '@yss-ui/components';
</script>

<template>
  <div style="display: flex; gap: 12px; align-items: center">
    <YButton permission-code="USER_ADD" type="primary">新建</YButton>
    <YButton permission-code="USER_EDIT" :fallback="'disable'">编辑（无权限禁用）</YButton>
  </div>
</template>
