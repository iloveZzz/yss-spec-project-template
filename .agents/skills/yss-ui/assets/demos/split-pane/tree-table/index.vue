<script setup lang="ts">
import { ref } from 'vue';
import { YTree, YSplitPane } from '@yss-ui/components';
import { initialTreeData as tree } from './constant';
import './style.less';

defineOptions({ name: 'SplitPaneTreeTableDemo' });

const leftWidth = ref<number>(280);
const collapsed = ref<boolean>(false);

const onLeftWidthUpdate = (v: number): void => {
  leftWidth.value = v;
};

const onToggleChange = (v: boolean): void => {
  collapsed.value = v;
};

const getActions = (): Array<{ key: string; label: string; danger?: boolean }> => {
  return [
    { key: 'new-folder', label: '新建文件夹' },
    { key: 'rename', label: '重命名' },
    { key: 'delete', label: '删除', danger: true },
  ];
};
</script>

<template>
  <div class="layout">
    <YSplitPane
      :initial-width="280"
      :min-width="200"
      :max-width="480"
      collapsible
      storage-key="demo_split_tree_width"
      @update:left-width="onLeftWidthUpdate"
      @toggle="onToggleChange"
    >
      <template #left>
        <YTree :tree-data="tree" :get-node-actions="getActions" />
      </template>
      <template #right>
        <div class="right">
          <div class="info">
            <span>左侧宽度：{{ leftWidth }}px</span>
            <span>{{ collapsed ? '已收起' : '已展开' }}</span>
          </div>
          <div class="placeholder">
            <div class="placeholder__content">右侧内容区域</div>
          </div>
        </div>
      </template>
    </YSplitPane>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
