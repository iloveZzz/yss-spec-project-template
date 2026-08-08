<script setup lang="ts">
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { YButton, YEditTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTablePaginationAction' });

const tableRef = ref<any>();
const data = ref<any[]>(
  Array.from({ length: 37 }).map((_, i) => ({ name: `姓名${i + 1}`, age: i, sex: i % 2 ? '1' : '0' }))
);

const columns: YEditTableColumn[] = [
  { title: '姓名', field: 'name', component: 'form-item-input' },
  { title: '年龄', field: 'age', component: 'form-item-input-number', width: 120 },
  {
    title: '性别',
    field: 'sex',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
    width: 140,
  },
  {
    title: '技能(多选)',
    field: 'skills',
    component: 'form-item-select',
    props: { multiple: true, maxTagCount: 'responsive' },
    options: [
      { label: 'Vue', value: 'vue' },
      { label: 'React', value: 'react' },
      { label: 'TypeScript', value: 'ts' },
      { label: 'Node.js', value: 'node' },
    ],
    minWidth: 200,
  },
  {
    type: 'action',
    width: 80,
    title: '操作',
  },
];

const tableConfig = { editConfig: { trigger: 'click', mode: 'row' } };

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: data.value.length,
  showQuickJumper: true,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  remote: false,
});

const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
};

const actionConfig: YTableActionConfig = {
  align: 'center',
  buttons: [
    {
      key: 'remove',
      text: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: { title: '是否删除此条数据？', needLoading: true },
      clickFn: (scope: any, _btn: any, { close, hideLoading }: any) => onDelete(data, { scope, close, hideLoading }),
    },
  ],
};

const resetPageData = () => {
  data.value = Array.from({ length: 37 }).map((_, i) => ({ name: `姓名${i + 1}`, age: i, sex: i % 2 ? '1' : '0' }));
  pagination.value = { ...pagination.value, current: 1, total: data.value.length };
};

const onPageChange = ({ current, pageSize }: any) => {
  pagination.value = { ...pagination.value, current, pageSize };
};

const onSizeChange = (size: number) => {
  pagination.value = { ...pagination.value, current: 1, pageSize: size };
};

const onDelete = (listRef: { value: any[] } | any[], payload: any) => {
  const isRef = Array.isArray((listRef as any).value);
  const arr = isRef ? (listRef as any).value : (listRef as any);
  const { scope, close, hideLoading } = normalizeDeletePayload(payload);
  const { rowIndex } = scope || {};
  setTimeout(() => {
    arr.splice(rowIndex, 1);
    hideLoading?.();
    close?.();
  }, 400);
};

const normalizeDeletePayload = (payload: any) => {
  if (!payload) return { scope: null, close: () => {}, hideLoading: () => {} };
  if ('scope' in payload) return payload;
  const [scope, _config, helpers] = payload || [];
  return { scope, ...(helpers || {}) };
};
</script>

<template>
  <div style="padding: 12px">
    <div style="text-align: right; margin-bottom: 8px">
      <YButton @click="resetPageData">重置数据</YButton>
    </div>
    <YEditTable
      ref="tableRef"
      v-model:data="data"
      :columns="columns"
      :table-config="tableConfig"
      :options-map="optionsMap"
      :pageable="true"
      :pagination="pagination"
      :action-config="actionConfig"
      :toolbar-config="{ custom: true }"
      @page-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>

<style scoped></style>
