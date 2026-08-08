<script setup lang="ts">
import { YButton, YMonaco } from '@yss-ui/components';
import { ref } from 'vue';

const refEditor = ref<InstanceType<typeof YMonaco> | null>(null);
const code = ref<string>(`// 点击按钮或右键菜单“全屏”进入应用内全屏\n// 再次点击退出\n`);

const toggle = () => refEditor.value?.toggleFullscreen();
</script>

<template>
  <div class="demo-fullscreen-target-container">
    <div class="demo-fullscreen-target-header">
      <YButton size="small" type="primary" @click="toggle">切换应用内全屏</YButton>
    </div>
    <div class="demo-fullscreen-target">
      <div class="demo-fullscreen-target-left">左侧内容</div>

      <div id="monaco-fullscreen-target" class="demo-fullscreen-target-right">
        <div class="demo-fullscreen-target-right-header">
          <YButton size="small" type="primary">查询</YButton>
          <YButton size="small">重置</YButton>
        </div>
        <YMonaco
          ref="refEditor"
          v-model="code"
          language="javascript"
          :height="`calc(100% - 40px)`"
          class="demo-fullscreen-target-right-monaco"
          :fullscreen-target="'#monaco-fullscreen-target'"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-fullscreen-target-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 500px;
}

.demo-fullscreen-target-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.demo-fullscreen-target {
  padding: 16px;
  background-color: #f0f0f0;
  border: 1px dashed var(--demo-border-color, #d9d9d9);
  height: 100%;
  display: flex;
}

.demo-fullscreen-target-left {
  /* 固定宽度且不收缩，避免全屏切换后被兄弟元素挤压 */
  flex: 0 0 120px;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
}

.demo-fullscreen-target-right-header {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.demo-fullscreen-target-right {
  flex: 1;

  /* 关键：在 flex 容器中允许按父容器收缩，避免溢出滚动 */
  min-width: 0;
  background-color: #fff;
  padding: 16px;
}
</style>
