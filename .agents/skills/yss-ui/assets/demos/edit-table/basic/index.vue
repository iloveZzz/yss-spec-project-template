<script setup lang="ts">
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { YButton, YEditTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableBasic' });

const tableRef = ref<any>();
const data = ref<any[]>([
  { name: '张三', age: 18, status: '1' },
  { name: '李四', age: 25, status: '0' },
]);

const columns: YEditTableColumn[] = [
  {
    title: '姓名',
    field: 'name',
    component: 'form-item-input',
  },
  {
    title: '年龄',
    field: 'age',
    component: 'form-item-input-number',
    props: { min: 0 },
  },
  {
    title: '状态（字典翻译）',
    field: 'status',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
  },
  {
    title: '状态（行内写死）',
    field: 'status2',
    component: 'form-item-select',
    options: [
      { label: '已完成', value: '0' },
      { label: '进行中', value: '1' },
    ],
  },
  { type: 'action', title: '操作', width: 160 },
];

const tableConfig = { editConfig: { trigger: 'click', mode: 'row' }, size: 'small' };

const optionsMap = {
  status: [
    { dictName: '已完成', dictValue: '0' },
    { dictName: '进行中', dictValue: '1' },
    { dictName: '未开始', dictValue: '2' },
    { dictName: '已取消', dictValue: '3' },
  ],
};

const actionConfig: YTableActionConfig = {
  buttons: [
    {
      key: 'remove',
      text: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: { title: '是否删除此行？', needLoading: true },
      clickFn: (scope: any, _btn: any, { close, hideLoading }: any) => onDelete(data, { scope, close, hideLoading }),
    },
  ],
};

const add = () => {
  const item: any = {};
  columns.forEach(c => c.field && (item[c.field] = ''));
  data.value.push(item);
};

const onDelete = (listRef: { value: any[] }, payload: any) => {
  const { scope, close, hideLoading } = payload || {};
  const { rowIndex } = scope || {};
  setTimeout(() => {
    listRef.value.splice(rowIndex, 1);
    hideLoading?.();
    close?.();
  }, 300);
};
</script>

<template>
  <div style="padding: 12px">
    <div style="text-align: right; margin-bottom: 8px">
      <YButton style="margin-left: 8px" @click="add">添 行</YButton>
    </div>
    <YEditTable
      ref="tableRef"
      v-model:data="data"
      addable
      :columns="columns"
      :table-config="tableConfig"
      :options-map="optionsMap"
      :action-config="actionConfig"
      @add="add"
    />
  </div>
</template>

<style scoped></style>
