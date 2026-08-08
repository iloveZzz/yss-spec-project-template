<template>
  <div class="demo">
    <YTree
      v-model:selected-keys="selectedKeys"
      :tree-data="data"
      :multiple="true"
      default-expand-all
      block-node
      @select="onSelect"
    />
    <div class="tips">按住 Cmd/Ctrl 可多选节点</div>
    <div class="result">
      <span v-for="k in selectedKeys" :key="k" class="tag">{{ k }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { YTree } from '@yss-ui/components';

const selectedKeys = ref<(string | number)[]>(['1-1']);
const data = ref([
  {
    key: 'root',
    title: '多选（高亮选中）',
    children: [
      {
        key: '1',
        title: '分组-1',
        children: [
          { key: '1-1', title: '项-1-1' },
          { key: '1-2', title: '项-1-2' },
        ],
      },
      {
        key: '2',
        title: '分组-2',
        children: [
          { key: '2-1', title: '项-2-1' },
          { key: '2-2', title: '项-2-2' },
        ],
      },
    ],
  },
]);

const onSelect = (keys: any, info: any) => {
  selectedKeys.value = Array.isArray(keys) ? keys : keys.selected;
  console.info('selected:', keys, info);
};
</script>
<style scoped lang="less">
.demo {
  width: 320px;
}
.tips {
  margin-top: 8px;
  color: var(--y-demo-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 12px;
}
.result {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--y-demo-chip-bg, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--y-demo-chip-border, rgba(0, 0, 0, 0.08));
  font-size: 12px;
}
</style>
