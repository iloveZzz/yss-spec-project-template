<script setup lang="ts">
import { YButton, YEditTable, type YEditTableColumn, type YTableActionConfig } from '@yss-ui/components';
import { Collapse as ACollapse, CollapsePanel as ACollapsePanel, message } from 'ant-design-vue';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableRowOptions' });

type Option = { label: string; value: string };

const tableRef = ref<any>();

const data = ref<any[]>([
  { id: 1, product: 'p1', productName: '企业邮箱', version: 'p1-v2', quantity: 10, remark: '老客户' },
  { id: 2, product: 'p2', productName: '云存储', version: 'p2-v1', quantity: 1, remark: '' },
]);

const columns: YEditTableColumn[] = [
  {
    title: '产品',
    field: 'product',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'label', value: 'value' } },
    width: 180,
  },
  {
    title: '产品名称',
    field: 'productName',
    component: 'form-item-input',
    minWidth: 160,
    props: { placeholder: '选择产品后自动回填' },
  },
  {
    title: '版本（行级字典）',
    field: 'version',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'label', value: 'value' } },
    minWidth: 200,
    cellProps: ({ row }) => ({ loading: !!row.__loadingVersions }),
    filterOptions: ({ row }: any) => row?.opts?.version || productToVersions[row?.product] || [],
  },
  { title: '数量', field: 'quantity', component: 'form-item-input-number', width: 120, props: { min: 1 } },
  { title: '备注', field: 'remark', component: 'form-item-input', minWidth: 200 },
  { type: 'action', title: '操作', width: 160 },
];

const optionsMap = ref<Record<string, Option[]>>({
  product: [
    { label: '企业邮箱', value: 'p1' },
    { label: '云存储', value: 'p2' },
    { label: '在线协作', value: 'p3' },
  ],
});

const productToVersions: Record<string, Option[]> = {
  p1: [
    { label: '标准版', value: 'p1-v1' },
    { label: '旗舰版', value: 'p1-v2' },
  ],
  p2: [
    { label: '基础版', value: 'p2-v1' },
    { label: '容量加强版', value: 'p2-v2' },
    { label: '企业版', value: 'p2-v3' },
  ],
  p3: [
    { label: '团队版', value: 'p3-v1' },
    { label: '企业版', value: 'p3-v2' },
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

const onUpdateRow = async ({ row, key, value }: { row: any; key: string; value: any }) => {
  if (key === 'product') {
    const hit = (optionsMap.value.product || []).find(o => `${o.value}` === `${value}`);
    row.productName = hit?.label || '';
    row.version = '';

    row.__loadingVersions = true;
    const list = await mockFetchVersions(value);
    row.opts = { version: list };
    row.__loadingVersions = false;
  }
};

const mockFetchVersions = (product: string): Promise<Option[]> =>
  new Promise(resolve => setTimeout(() => resolve(productToVersions[product] || []), 300));

const add = () => {
  const item: any = {};
  columns.forEach(c => {
    if (!c.field) return;
    const comp = (c as any).component;
    if (comp === 'form-item-input-number') item[c.field] = 1;
    else if (comp === 'form-item-switch') item[c.field] = false;
    else item[c.field] = '';
  });
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

const simulateGlobalDictSwitch = () => {
  optionsMap.value.product = [
    { label: '企业邮箱 Pro', value: 'p1' },
    { label: '云存储 Pro', value: 'p2' },
    { label: '在线协作 Pro', value: 'p3' },
  ];
  message.success('已模拟全局字典切换（仅影响"产品"列）');
};
</script>

<template>
  <div style="padding: 12px">
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
      <div>
        <YButton style="margin-left: 8px" @click="simulateGlobalDictSwitch">模拟全局字典切换</YButton>
      </div>
    </div>

    <YEditTable
      ref="tableRef"
      v-model:data="data"
      :columns="columns"
      :table-config="{ editConfig: { trigger: 'click', mode: 'row' } }"
      :options-map="optionsMap"
      :action-config="actionConfig"
      row-options-field-name="opts"
      addable
      @add="add"
      @update-row="onUpdateRow"
    />

    <a-collapse v-if="data" style="margin-top: 12px">
      <a-collapse-panel key="data" header="查看数据">
        <div style="padding: 12px; border: 1px dashed #d9d9d9; border-radius: 4px">
          <div style="color: #999; margin-bottom: 6px">当前数据：</div>
          <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(data, null, 2) }}</pre>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<style scoped></style>
