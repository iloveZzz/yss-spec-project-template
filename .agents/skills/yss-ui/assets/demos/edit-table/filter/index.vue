<script setup lang="ts">
import { YButton, YEditTable, type YEditTableColumn, type YTableActionConfig } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableFilter' });

const tableRef = ref<any>();
const data = ref<any[]>([
  { name: '1', age: 18, sex: '1' },
  { name: '2', age: 26, sex: '0' },
]);

const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
  name: [
    { label: '张三', value: '1' },
    { label: '李四', value: '2' },
    { label: '王五', value: '3' },
    { label: '赵六', value: '4' },
  ],
};

const columns: YEditTableColumn[] = [
  {
    title: '姓名',
    field: 'name',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'label', value: 'value' } },
    filterOptions: ({ field, optionsMap, row }: any) => {
      const all = optionsMap?.[field] || [];
      const selected = (data.value || []).reduce((acc: any[], item: any) => {
        if (!item?.[field] || item === row) return acc;
        acc.push(item[field]);
        return acc;
      }, []);
      return all.filter((opt: any) => !selected.includes(opt.value));
    },
  },
  { title: '年龄', field: 'age', component: 'form-item-input-number', props: { min: 0 } },
  {
    title: '性别',
    field: 'sex',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
  },
  { type: 'action', title: '操作', width: 160 },
];

const tableConfig = {
  editConfig: { trigger: 'click', mode: 'row' },
  editRules: { name: [{ required: true }], sex: [{ required: true }] },
};

const add = () => {
  const item: any = {};
  columns.forEach(c => c.field && (item[c.field] = ''));
  data.value.push(item);
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
      <YButton @click="add">添 行</YButton>
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
