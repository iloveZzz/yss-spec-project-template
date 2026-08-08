<script setup lang="ts">
import { ref } from 'vue';
import { message, Button } from 'ant-design-vue';
import { YTable, type YTableColumn } from '@yss-ui/components';

defineOptions({ name: 'DemoTableActionExpand' });

const yTableRef = ref();

const columns: YTableColumn[] = [
  { type: 'expand', width: 1 }, // 必不可少的开启展开行内置核心列
  { type: 'seq', width: 60, title: '序号', align: 'center' },
  { title: '任务名称', field: 'name' },
  { title: '状态', field: 'status' },
  { title: '执行人', field: 'executor' },
  { title: '操作', field: 'action', width: 140 },
];

// 模拟表格数据
interface TaskItem {
  id: string;
  name: string;
  status: string;
  executor: string;
  _btnLoading?: boolean; // 新增：控制按钮 Loading
  details?: any[];
}

const tableData = ref<TaskItem[]>([
  { id: '1', name: '数据同步任务', status: '成功', executor: 'daoming' },
  { id: '2', name: '报表生成任务', status: '失败', executor: 'yancong' },
  { id: '3', name: '日志清理任务', status: '待执行', executor: 'zhangsan' },
]);

// 操作列的自定义事件
const handleLogClick = (row: any) => {
  message.info(`查看任务日志: ${row.name}`);
};

const handleStepClick = async (row: any) => {
  const tableInst = yTableRef.value?.getTableInstance();
  if (!tableInst) return;

  // 如果已经展开了，直接切换折叠状态
  if (tableInst.isExpandByRow(row)) {
    tableInst.setRowExpand(row, false);
    return;
  }

  // 没展开且已有数据，直接展开
  if (row.details && row.details.length > 0) {
    tableInst.setRowExpand(row, true);
    return;
  }

  const target = tableData.value.find(item => item.id === row.id);
  if (target) {
    target._btnLoading = true;
    try {
      const res = await fetchStepDetails(target.id);
      target.details = res || [];
      // 请求完成，展开行
      tableInst.setRowExpand(row, true);
    } catch (e) {
      console.error(e);
      target.details = [];
    } finally {
      target._btnLoading = false;
    }
  }
};

// 模拟异步获取步骤详情的方法
const fetchStepDetails = (id: string): Promise<any[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // 模拟没有数据的情况
      if (id === '1') {
        resolve([]);
      } else {
        resolve([
          { step: '步骤一：数据抽取', time: '2023-11-20 10:00:00', status: '成功' },
          { step: '步骤二：数据清洗', time: '2023-11-20 10:05:00', status: '成功' },
          { step: '步骤三：数据入库', time: '2023-11-20 10:10:00', status: '正在执行' },
        ]);
      }
    }, 2000); // 延长到 2000ms 更容易看清加载状态
  });
};

// 展开行触发事件 (仅用于记录或额外控制，因为请求已在按钮里处理)
const onToggleRowExpand = async () => {
  // 置空即可，不需要在这里做请求
};
</script>

<template>
  <div style="padding: 12px">
    <YTable
      ref="yTableRef"
      :columns="columns"
      :data="tableData"
      :pageable="false"
      :row-config="{ keyField: 'id' }"
      :auto-flex-column="false"
      :expand-config="{ accordion: true, iconOpen: ' ', iconClose: ' ' }"
      @toggle-row-expand="onToggleRowExpand"
    >
      <!-- 使用自定义操作列插槽接管按钮渲染 -->
      <template #action="{ row }">
        <Button type="link" size="small" @click="handleLogClick(row)">日志</Button>
        <Button
          type="link"
          size="small"
          :loading="tableData.find(item => item.id === row.id)?._btnLoading"
          @click="handleStepClick(row)"
        >
          步骤
        </Button>
      </template>

      <!-- hide-default-icon 通过将 iconOpen 和 iconClose 设为空字符串实现 -->
      <template #expand-row="{ row }">
        <div style="padding: 16px 24px; background: #fafafa">
          <YTable
            :columns="[
              { type: 'seq', width: 60, title: '序号', align: 'center' },
              { title: '执行步骤', field: 'step' },
              { title: '执行时间', field: 'time' },
              { title: '状态', field: 'status' },
            ]"
            :data="tableData.find(item => item.id === row.id)?.details || []"
            :pageable="false"
            :auto-flex-column="false"
          />
        </div>
      </template>
    </YTable>
  </div>
</template>

<style scoped></style>
