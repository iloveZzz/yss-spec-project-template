<template>
  <div style="display: flex; gap: 12px; align-items: center">
    <YButton permission-code="r_security-m_security_datamask-b_datamask_add" type="primary" @click="log('add')">
      新建
    </YButton>
    <YButton
      permission-code="r_1security-m_security_classification-b_classification_add"
      :fallback="'disable'"
      @click="log('edit')"
    >
      编辑（无权限禁用）
    </YButton>
    <YButton @click="log('normal')">普通按钮（无校验）</YButton>
  </div>
</template>

<script setup lang="ts">
import { YButton } from '@yss-ui/components';

const log = (msg: string) => console.log('[auth-basic]', msg);

// 在浏览器控制台可手动模拟：
// localStorage.setItem('auth_btns', JSON.stringify([{ btnCode:'USER_ADD', btnName:'新建' }]))
</script>
