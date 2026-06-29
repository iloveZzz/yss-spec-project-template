<script setup lang="ts">
import { YButton, YEditTable } from '@yss-ui/components';
import { Collapse as ACollapse, CollapsePanel as ACollapsePanel } from 'ant-design-vue';
import { useAsyncRemote } from './hooks/useAsyncRemote';

defineOptions({ name: 'DemoEditTableAsyncRemote' });

const { data, columns, optionsMap, serverProductNameMap, editRules, add, onUpdateRow } = useAsyncRemote();
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
      <a-collapse-panel key="srv" header="模拟服务端返回（当前数据集）">
        <div style="padding: 12px; border: 1px dashed #d9d9d9; border-radius: 4px">
          <div style="color: #999; margin-bottom: 6px">products：</div>
          <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(optionsMap.product, null, 2) }}</pre>
          <div style="color: #999; margin: 6px 0">productNameMap（按所选产品动态过滤）：</div>
          <pre style="margin: 0; white-space: pre-wrap">{{ JSON.stringify(serverProductNameMap, null, 2) }}</pre>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<style scoped></style>
