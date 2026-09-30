# 页面组合示例

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 最小组合示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YButton, YCard, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { TABLE_COLUMNS } from './constant';
import { useRuleList } from './hooks/useRuleList';

const emit = defineEmits<{ create: [] }>();
const tableAreaRef = ref<HTMLDivElement>();
const { tableHeight, isReady } = useTableHeight(tableAreaRef, { withPagination: true, withToolbar: true });
const { loading, dataList, pagination, handlePageChange } = useRuleList();

/** 打开新增表单，实际项目中由表单 Hook 实现。 */
const openCreate = (): void => {
  emit('create');
};
</script>

<template>
  <YCard class="page-card">
    <div ref="tableAreaRef" class="table-area">
      <YTable
        v-if="isReady"
        :height="tableHeight"
        :data="dataList"
        :columns="TABLE_COLUMNS"
        :loading="loading"
        pageable
        v-model:pagination="pagination"
        @page-change="handlePageChange"
      >
        <template #toolbar-right>
          <YButton type="primary" @click="openCreate">新增</YButton>
        </template>
      </YTable>
    </div>
  </YCard>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```
