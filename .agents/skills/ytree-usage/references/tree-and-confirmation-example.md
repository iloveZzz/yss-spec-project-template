## 标准代码骨架

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YTree, type YTreeActionItem } from '@yss-ui/components';
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

/** 树节点数据。 */
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const emit = defineEmits<{
  create: [node: TreeNode];
  edit: [node: TreeNode];
}>();
const treeAreaRef = ref<HTMLDivElement>();
const treeData = ref<TreeNode[]>([]);
const searchValue = ref('');
const selectedKeys = ref<Array<string | number>>([]);
const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,
});

/** 生成当前节点的非危险操作。 */
const getNodeActions = (): YTreeActionItem[] => [
  { key: 'add', label: '新增子节点' },
  { key: 'edit', label: '编辑' },
];

/** 处理 YTree 动作事件。 */
const handleTreeAction = ({ key, node }: { key: string; node: TreeNode }) => {
  if (key === 'add') emit('create', node);
  if (key === 'edit') emit('edit', node);
};
</script>

<template>
  <div ref="treeAreaRef" class="tree-area">
    <YTree
      :height="treeHeight"
      :tree-data="treeData"
      :field-names="{ title: 'name', key: 'id', children: 'children' }"
      filterable
      show-actions
      v-model:searchValue="searchValue"
      v-model:selectedKeys="selectedKeys"
      :get-node-actions="getNodeActions"
      @action="handleTreeAction"
    />
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```

```less
/* style.less */
.tree-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

## 删除确认边界

```vue
<template #node-suffix="{ node }">
  <Popconfirm title="确认删除该节点吗？" ok-text="确定" cancel-text="取消" @confirm="handleDelete(node)">
    <YButton type="link" @click.stop>删除</YButton>
  </Popconfirm>
</template>
```

`Popconfirm` 从 `ant-design-vue` 导入，`YButton` 从 `@yss-ui/components` 导入。如果每个节点都展示删除会过密，把同样的 `Popconfirm` 放到选中节点的页面工具栏。
