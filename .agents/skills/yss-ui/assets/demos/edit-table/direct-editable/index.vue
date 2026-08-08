<script setup lang="ts">
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { YEditTable } from '@yss-ui/components';
import {
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
} from 'ant-design-vue';
import { ref } from 'vue';

defineOptions({ name: 'DemoEditTableDirectEditable' });

const data = ref<any[]>([{ name: '张三', age: 18, status: '1' }]);

const columns: YEditTableColumn[] = [
  { title: '姓名', field: 'name' },
  { title: '年龄', field: 'age' },
  { title: '状态', field: 'status' },
  { type: 'action', title: '操作', width: 160 },
];

const statusOptions = [
  { dictName: '已完成', dictValue: '0' },
  { dictName: '进行中', dictValue: '1' },
  { dictName: '未开始', dictValue: '2' },
  { dictName: '已取消', dictValue: '3' },
];

const add = () => {
  const r: any = {};
  columns.forEach(c => c.field && (r[c.field] = ''));
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
    <YEditTable v-model:data="data" :columns="columns" :action-config="actionConfig" addable @add="add">
      <!-- 全部单元格直接可编辑：使用字段插槽在查看态渲染输入控件 -->
      <template #name="{ row }">
        <a-input v-model:value="row.name" placeholder="请输入" />
      </template>
      <template #age="{ row }">
        <a-input-number v-model:value="row.age" :min="0" style="width: 100%" placeholder="请输入" />
      </template>
      <template #status="{ row }">
        <a-select
          v-model:value="row.status"
          :options="statusOptions"
          :field-names="{ label: 'dictName', value: 'dictValue' }"
          show-search
          allow-clear
          style="width: 100%"
        />
      </template>
    </YEditTable>
  </div>
  <div style="padding: 12px 12px 0; color: #999">提示：点击任意单元格直接进入编辑。</div>
  <a-collapse v-if="data" style="margin-top: 12px">
    <a-collapse-panel key="data" header="查看数据">
      <div style="padding: 12px; border: 1px dashed #d9d9d9; border-radius: 4px">
        <div style="color: #999; margin-bottom: 6px">已保存的数据：</div>
        <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </a-collapse-panel>
  </a-collapse>
</template>

<style scoped></style>
