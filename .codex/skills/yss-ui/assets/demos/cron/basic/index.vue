<script setup lang="ts">
/**
 * YCron 基础用法示例
 */
import { ref } from 'vue';
import { YCron } from '@yss-ui/components';

/** Cron 表达式 */
const cronValue = ref('0 0 12 * * ?');

/**
 * 处理值变化
 */
const handleChange = (value: string) => {
  console.log('Cron 表达式已更新:', value);
};
</script>

<template>
  <div class="demo-cron-basic">
    <YCron v-model="cronValue" @change="handleChange" />
  </div>
</template>

<style scoped lang="less">
.demo-cron-basic {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.demo-label {
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.demo-value {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
  color: #3371ff;
  background: #e6f4ff;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
