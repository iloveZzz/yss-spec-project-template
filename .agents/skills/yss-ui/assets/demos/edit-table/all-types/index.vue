<script setup lang="ts">
import { YEditTable } from '@yss-ui/components';
import { Collapse as ACollapse, CollapsePanel as ACollapsePanel } from 'ant-design-vue';
import { useAllTypes } from './hooks/useAllTypes';

defineOptions({ name: 'DemoEditTableAllTypes' });

const { data, columns, optionsMap, actionConfig, add } = useAllTypes();
</script>

<template>
  <div style="padding: 12px">
    <YEditTable
      v-model:data="data"
      :columns="columns"
      :table-config="{ editConfig: { trigger: 'click', mode: 'row' } }"
      :options-map="optionsMap"
      :action-config="actionConfig"
      addable
      @add="add"
    />
  </div>
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
