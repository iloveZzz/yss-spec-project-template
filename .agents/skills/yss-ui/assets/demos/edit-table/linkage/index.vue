<script setup lang="ts">
import { YButton, YEditTable, type YEditTableColumn, type YTableActionConfig } from '@yss-ui/components';
import { Collapse as ACollapse, CollapsePanel as ACollapsePanel } from 'ant-design-vue';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableLinkage' });

const data = ref<any[]>([
  {
    product: 'p1',
    productName: '企业邮箱',
    version: 'p1-v2',
    quantity: 2,
    price: 199,
    total: 398,
    enabled: true,
    remark: '试用客户优先处理',
  },
]);

const columns: YEditTableColumn[] = [
  {
    title: '产品',
    field: 'product',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'label', value: 'value' } },
    width: 160,
  },
  {
    title: '产品名称',
    field: 'productName',
    component: 'form-item-input',
    minWidth: 180,
    props: { placeholder: '选择产品后自动回填名称' },
  },
  {
    title: '版本',
    field: 'version',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'label', value: 'value' } },
    minWidth: 160,
    filterOptions: ({ row }: any) => {
      const product = row?.product;
      return productToVersions[product] || [];
    },
  },
  { title: '数量', field: 'quantity', component: 'form-item-input-number', width: 120, props: { min: 1 } },
  { title: '单价(¥)', field: 'price', component: 'form-item-input-number', width: 140, props: { min: 0, step: 1 } },
  { title: '总价(¥)', field: 'total', component: 'form-item-input-number', width: 140, props: { disabled: true } },
  {
    title: '启用',
    field: 'enabled',
    component: 'form-item-switch',
    width: 120,
    props: { trueText: '启用', falseText: '停用', style: { width: '34px' } },
  },
  {
    title: '备注',
    field: 'remark',
    component: 'form-item-input',
    minWidth: 200,
    customRule: (_val: any, row: any) => {
      if (row?.enabled && !row?.remark) return { errMsg: '启用时，备注必填' };
      return { errMsg: '' };
    },
  },
  { type: 'action', title: '操作', width: 160 },
];

const optionsMap = {
  product: [
    { label: '企业邮箱', value: 'p1' },
    { label: '云存储', value: 'p2' },
    { label: '在线协作', value: 'p3' },
  ],
};

const productToVersions: Record<string, { label: string; value: string }[]> = {
  p1: [
    { label: '标准版', value: 'p1-v1' },
    { label: '旗舰版', value: 'p1-v2' },
  ],
  p2: [
    { label: '基础版', value: 'p2-v1' },
    { label: '容量加强版', value: 'p2-v2' },
  ],
  p3: [
    { label: '团队版', value: 'p3-v1' },
    { label: '企业版', value: 'p3-v2' },
  ],
};

const editRules: Record<string, any[]> = {
  product: [{ required: true }],
  version: [{ required: true }],
  quantity: [{ required: true }],
};

const add = () => {
  const item: any = {};
  columns.forEach(c => {
    if (!c.field) return;
    const comp = (c as any).component;
    if (comp === 'form-item-switch') item[c.field] = false;
    else if (comp === 'form-item-input-number') item[c.field] = 0;
    else item[c.field] = '';
  });
  item.quantity = 1;
  item.enabled = true;
  data.value.push(item);
};

const onUpdateRow = ({ row, key, value }: { row: any; key: string; value: any }) => {
  if (key === 'product') {
    const hit = (optionsMap.product || []).find((o: any) => `${o.value}` === `${value}`);
    row.productName = hit?.label || '';
    row.version = '';
  }
  if (key === 'quantity' || key === 'price') {
    const q = Number(row.quantity) || 0;
    const p = Number(row.price) || 0;
    row.total = Number((q * p).toFixed(2));
  }
  if (key === 'enabled' && !value) {
    row.remark = '';
  }
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
      <YButton type="primary" @click="add">添 行</YButton>
    </div>
    <YEditTable
      v-model:data="data"
      :columns="columns"
      :table-config="{ editConfig: { trigger: 'click', mode: 'row' }, editRules }"
      :options-map="optionsMap"
      :action-config="actionConfig"
      addable
      @add="add"
      @update-row="onUpdateRow"
    />
  </div>
  <a-collapse v-if="data" style="margin-top: 12px">
    <a-collapse-panel key="data" header="查看数据">
      <div style="padding: 12px; border: 1px dashed #d9d9d9; border-radius: 4px">
        <div style="color: #999; margin-bottom: 6px">当前数据：</div>
        <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </a-collapse-panel>
  </a-collapse>
</template>

<style scoped></style>
