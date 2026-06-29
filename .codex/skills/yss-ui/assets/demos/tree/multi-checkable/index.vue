<template>
  <div class="demo">
    <div class="panel">
      <YTree
        v-model:checked-keys="checkedKeys"
        :tree-data="data"
        checkable
        default-expand-all
        :selectable="false"
        block-node
        @check="onCheck"
      />
    </div>
    <div class="result">
      <div class="result__title">已勾选 Keys：</div>
      <div class="result__list">
        <span v-for="k in checkedKeys" :key="k" class="tag">{{ k }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { YTree } from '@yss-ui/components';

const checkedKeys = ref<(string | number)[]>(['1-1']);
const data = ref([
  {
    key: 'root',
    title: '多选（复选框）',
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

const onCheck = (keys: any, info: any) => {
  // antdv 事件形态：keys 可能是数组或对象（受控/非受控差异）
  checkedKeys.value = Array.isArray(keys) ? keys : keys.checked;
  console.info('checked:', keys, info);
};
</script>
<style scoped lang="less">
.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel {
  width: 320px;
}
.result__title {
  color: var(--y-demo-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 12px;
}
.result__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
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
