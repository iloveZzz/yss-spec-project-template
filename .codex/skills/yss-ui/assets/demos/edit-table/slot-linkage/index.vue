<script setup lang="ts">
import { YButton, YEditTable, type YEditTableColumn, type YTableActionConfig } from '@yss-ui/components';
import {
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  Switch as ASwitch,
} from 'ant-design-vue';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableSlotLinkage' });

const data = ref<any[]>([
  {
    product: 'p1',
    productName: '企业邮箱',
    version: 'p1-v2',
    quantity: 2,
    price: 199,
    total: 398,
    enabled: true,
    remark: '',
  },
]);

const columns: YEditTableColumn[] = [
  { title: '产品', field: 'product' },
  { title: '产品名称', field: 'productName' },
  { title: '版本', field: 'version' },
  { title: '数量', field: 'quantity' },
  { title: '单价(¥)', field: 'price' },
  { title: '总价(¥)', field: 'total' },
  { title: '启用', field: 'enabled' },
  { title: '备注', field: 'remark' },
  { type: 'action', title: '操作', width: 160 },
];

const productOptions = [
  { label: '企业邮箱', value: 'p1' },
  { label: '云存储', value: 'p2' },
  { label: '在线协作', value: 'p3' },
];

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

const onProductChange = (row: any, value: any) => {
  const hit = productOptions.find(o => `${o.value}` === `${value}`);
  row.productName = hit?.label || '';
  row.version = '';
};

const recalcTotal = (row: any) => {
  const q = Number(row.quantity) || 0;
  const p = Number(row.price) || 0;
  row.total = Number((q * p).toFixed(2));
};

const add = () => {
  const r: any = {};
  columns.forEach(c => c.field && (r[c.field] = ''));
  r.quantity = 1;
  r.price = 0;
  r.total = 0;
  r.enabled = true;
  data.value.push(r);
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
    <YEditTable v-model:data="data" :columns="columns" :action-config="actionConfig" addable @add="add">
      <template #product="{ row }">
        <a-select
          v-model:value="row.product"
          :options="productOptions"
          :field-names="{ label: 'label', value: 'value' }"
          show-search
          allow-clear
          style="width: 100%"
          @change="val => onProductChange(row, val)"
        />
      </template>

      <template #productName="{ row }">
        <a-input v-model:value="row.productName" placeholder="选择产品后自动回填名称" />
      </template>

      <template #version="{ row }">
        <a-select
          v-model:value="row.version"
          :options="productToVersions[row.product] || []"
          :field-names="{ label: 'label', value: 'value' }"
          show-search
          allow-clear
          style="width: 100%"
        />
      </template>

      <template #quantity="{ row }">
        <a-input-number
          v-model:value="row.quantity"
          :min="1"
          style="width: 100%"
          placeholder="数量"
          @change="() => recalcTotal(row)"
        />
      </template>

      <template #price="{ row }">
        <a-input-number
          v-model:value="row.price"
          :min="0"
          :step="1"
          style="width: 100%"
          placeholder="单价"
          @change="() => recalcTotal(row)"
        />
      </template>

      <template #total="{ row }">
        <a-input-number v-model:value="row.total" :min="0" style="width: 100%" :disabled="true" />
      </template>

      <template #enabled="{ row }">
        <a-switch v-model:checked="row.enabled" @change="checked => !checked && (row.remark = '')" />
      </template>

      <template #remark="{ row }">
        <a-input v-model:value="row.remark" placeholder="启用时建议填写备注" />
      </template>
    </YEditTable>
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
