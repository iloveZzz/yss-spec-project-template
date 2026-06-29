<script setup lang="ts">
import { YButton, YEditTable, type YEditTableColumn, type YTableActionConfig } from '@yss-ui/components';
import { Collapse as ACollapse, CollapsePanel as ACollapsePanel } from 'ant-design-vue';
import { getCurrentInstance, ref } from 'vue';

defineOptions({ name: 'DemoEditTableSubmitView' });

const data = ref<any[]>([
  { name: '张三', status: '1', joinDate: '2024-10-01' },
  { name: '李四', status: '0', joinDate: '2024-10-02' },
]);

const saved = ref<any[] | null>(null);

const editRules: Record<string, any[]> = {
  name: [{ required: true }],
  status: [{ required: true }],
};

const columns: YEditTableColumn[] = [
  { title: '姓名', field: 'name', component: 'form-item-input' },
  {
    title: '状态',
    field: 'status',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
  },
  { title: '入职日期', field: 'joinDate', component: 'form-item-date', props: { format: 'YYYY-MM-DD' } },
  { type: 'action', title: '操作', width: 160 },
];

const optionsMap = {
  status: [
    { dictName: '已完成', dictValue: '0' },
    { dictName: '进行中', dictValue: '1' },
    { dictName: '未开始', dictValue: '2' },
    { dictName: '已取消', dictValue: '3' },
  ],
};

const add = () => {
  const r: any = {};
  columns.forEach(c => c.field && (r[c.field] = ''));
  data.value.push(r);
};

const save = async () => {
  const ins = getCurrentInstance() as any;
  const tableRef = ins?.refs?.tableRef;
  if (!tableRef) return (saved.value = JSON.parse(JSON.stringify(data.value)));
  const { valid } = await tableRef.validate();
  if (!valid) return alert('请先修复校验错误');
  saved.value = JSON.parse(JSON.stringify(data.value));
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
      <YButton type="primary" @click="save">保存</YButton>
      <YButton style="margin-left: 8px" @click="add">添 行</YButton>
    </div>
    <YEditTable
      v-model:data="data"
      :columns="columns"
      :table-config="{ editConfig: { trigger: 'click', mode: 'row' }, editRules }"
      :options-map="optionsMap"
      :action-config="actionConfig"
      addable
      @add="add"
    />
    <a-collapse v-if="saved" style="margin-top: 12px">
      <a-collapse-panel key="saved" header="查看数据">
        <div style="padding: 12px; border: 1px dashed #d9d9d9; border-radius: 4px">
          <div style="color: #999; margin-bottom: 6px">已保存的数据：</div>
          <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(saved, null, 2) }}</pre>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<style scoped></style>
