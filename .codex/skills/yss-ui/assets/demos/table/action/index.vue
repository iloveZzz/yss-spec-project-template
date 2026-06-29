<script setup lang="ts">
import { YTable, type YTableActionConfig, type YTableColumn } from '@yss-ui/components';
import { reactive, ref } from 'vue';
import './style.less';

defineOptions({ name: 'DemoTableAction' });

const pagination = ref({ current: 1, pageSize: 5, total: 0, showSizeChanger: true });

const columns = reactive<YTableColumn[]>([
  { type: 'seq' as const, title: '序号', width: 60, align: 'center' as const },
  { field: 'name', title: '姓名', width: 120 },
  { field: 'age', title: '年龄', width: 80, align: 'center' as const },
  { field: 'gender', title: '性别', width: 80, align: 'center' as const },
]);

const tableData = ref([
  { _X_ROW_KEY: '1', name: '张三', age: 28, gender: '男', isAudt: false },
  { _X_ROW_KEY: '2', name: '李四', age: 22, gender: '男', isAudt: true },
  { _X_ROW_KEY: '3', name: '王五', age: 26, gender: '女', isAudt: false },
  { _X_ROW_KEY: '4', name: '赵六', age: 30, gender: '男', isAudt: false },
]);

const actionConfig = reactive<YTableActionConfig>({
  width: 180,
  align: 'left',
  fixed: 'right',
  displayLimit: 2,
  moreRenderType: 'moreButton',
  buttons: [
    {
      text: '查看',
      key: 'view',
      type: 'link',
      clickFn: ({ row }: any) => alert(`查看：${row.name}`),
      disabledFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
    },
    {
      text: '编辑',
      key: 'hide',
      type: 'text',
      hideFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
      clickFn: ({ row }: any) => alert(`隐藏：${row.name}`),
    },
    {
      text: '运行',
      key: 'hide2',
      type: 'text',
      clickFn: ({ row }: any) => alert(`运行：${row.name}`),
    },
    {
      text: '删除',
      key: 'delete',
      type: 'text',
      isConfirm: true,
      confirmProps: { title: '是否确认删除此条数据？', needLoading: true },
      clickFn: async ({ row }: any, _btn: any, { hideLoading, close }: any) => {
        await new Promise(r => setTimeout(r, 1000));
        const idx = tableData.value.findIndex(i => i._X_ROW_KEY === row._X_ROW_KEY);
        if (idx > -1) tableData.value.splice(idx, 1);
        hideLoading();
        close();
        alert('删除成功');
      },
    },
  ],
});
</script>

<template>
  <div class="demo-container">
    <YTable
      v-model:pagination="pagination"
      :data="tableData"
      :columns="columns"
      :pageable="true"
      :action-config="actionConfig"
      :show-action-column="true"
    />
  </div>
</template>

<style scoped></style>
