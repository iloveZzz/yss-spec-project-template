<script setup lang="ts">
import { YTable, type YTableColumn } from '@yss-ui/components';
import { reactive, ref } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableGroupHeader' });

const columns = reactive<YTableColumn[]>([
  { type: 'seq', title: '序号', field: 'seq', width: 60, align: 'center' },
  {
    title: '人员信息',
    align: 'center',
    field: 'personInfo',
    headerAlign: 'center',
    children: [
      { field: 'name', title: '姓名', width: 120 },
      { field: 'sex', title: '性别', width: 80 },
    ],
  },
  {
    title: '位置信息',
    field: 'personInfo111',
    children: [
      { field: 'province', title: '省份', minWidth: 120 },
      { field: 'city', title: '城市', minWidth: 120 },
      { field: 'address', title: '地址', minWidth: 180 },
    ],
  },
  { field: 'age', title: '年龄', width: 80, align: 'center' },
]);

const tableData = ref(
  Array.from({ length: 8 }).map((_, i) => ({
    name: `测试${i + 1}`,
    sex: i % 2 ? '女' : '男',
    age: 20 + i,
    province: '广东',
    city: i % 2 ? '广州' : '深圳',
    address: '天河区某某路 88 号',
  }))
);

// 事件与方法示例
const tableRef = ref<InstanceType<typeof YTable>>();
const groupClickCount = ref(0);
const onGroupAction = () => {
  groupClickCount.value += 1;
};
</script>

<template>
  <div class="demo-container">
    <YTable
      id="demo-basic-ytable1111"
      ref="tableRef"
      :data="tableData"
      :columns="columns"
      :border="true"
      :toolbar-config="{ custom: true }"
      :custom-config="{ storage: true, immediate: true }"
      :column-config="{ drag: true, useKey: true }"
      :column-drag-config="{ isPeerDrag: true, isCrossDrag: true, isToChildDrag: true }"
    >
      <!-- 自定义分组表头内容（示例：仅定制“位置信息”分组） -->
      <template #group-header="{ column }">
        <div v-if="column.title === '位置信息'" class="group-header-slot">
          <span>📍 位置信息(自定义插槽)</span>
          <a class="link" @click.stop="onGroupAction">点击我({{ groupClickCount }})</a>
        </div>
        <span v-else>{{ column.title }}</span>
      </template>
    </YTable>
  </div>
</template>

<style scoped>
.group-header-slot {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.link {
  color: var(--primary-color, #3371ff);
  cursor: pointer;
}
</style>
