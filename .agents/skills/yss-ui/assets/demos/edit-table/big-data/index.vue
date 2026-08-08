<script setup lang="ts">
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { YEditTable } from '@yss-ui/components';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableBigData' });

const STATUS = [
  { dictName: '已完成', dictValue: '0' },
  { dictName: '进行中', dictValue: '1' },
  { dictName: '未开始', dictValue: '2' },
  { dictName: '已取消', dictValue: '3' },
];

const columns: YEditTableColumn[] = [
  { title: '序号', field: 'id', width: 80, align: 'center' },
  { title: '姓名', field: 'name', component: 'form-item-input', minWidth: 140 },
  { title: '年龄', field: 'age', component: 'form-item-input-number', props: { min: 0 }, width: 120, align: 'right' },
  {
    title: '状态',
    field: 'status',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
    width: 160,
  },
  { title: '日期', field: 'date', component: 'form-item-date', props: { format: 'YYYY-MM-DD' }, width: 160 },
  { type: 'action', title: '操作', width: 160 },
];

const optionsMap = { status: STATUS };

const makeRow = (i: number) => ({
  id: i + 1,
  name: `用户${i + 1}`,
  age: (i % 60) + 18,
  status: `${i % STATUS.length}`,
  date: `2024-10-${String((i % 28) + 1).padStart(2, '0')}`,
});

const data = ref<any[]>(Array.from({ length: 1000 }, (_, i) => makeRow(i)));

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
    <YEditTable
      v-model:data="data"
      :columns="columns"
      :table-config="{ editConfig: { trigger: 'click', mode: 'row' }, showOverflow: 'tooltip' }"
      :options-map="optionsMap"
      :max-height="480"
      :pageable="false"
      :action-config="actionConfig"
    />
  </div>
  <div style="padding: 0 12px; color: #999">当前行数：{{ data.length }}（无分页，滚动查看）</div>
</template>

<style scoped></style>
