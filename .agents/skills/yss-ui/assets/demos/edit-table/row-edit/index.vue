<script setup lang="ts">
import { ref } from 'vue';
import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { YEditTable } from '@yss-ui/components';

defineOptions({ name: 'DemoEditTableRowEdit' });

/**
 * 表格数据
 */
const data = ref<any[]>([
  { id: 1, name: 'Test1', sex: '1', age: 28 },
  { id: 2, name: 'Test2', sex: '0', age: 22 },
  { id: 3, name: 'Test3', sex: '1', age: 32 },
  { id: 4, name: 'Test4', sex: '0', age: 24 },
]);

/**
 * 表格实例引用
 */
const tableRef = ref<any>();

/**
 * 判断某行是否正在编辑（使用 VXE-Table 原生 API）
 */
const isEditing = (row: any): boolean => {
  const $table = tableRef.value?.getTableInstance();
  return $table ? $table.isEditByRow(row) : false;
};

/**
 * 列配置
 */
const columns: YEditTableColumn[] = [
  {
    title: '姓名',
    field: 'name',
    component: 'form-item-input',
    // 自定义校验：姓名不能重复
    customRule: (value: any, row: any, _field: string, tableData: any[]) => {
      if (!value) return { errMsg: '' };
      const duplicates = tableData.filter(item => item !== row && item.name === value);
      if (duplicates.length > 0) {
        return { errMsg: '姓名不能重复' };
      }
      return { errMsg: '' };
    },
  },
  {
    title: '性别',
    field: 'sex',
    component: 'form-item-select',
    isTransform: true,
    props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
  },
  {
    title: '年龄',
    field: 'age',
    component: 'form-item-input-number',
    // 自定义校验：年龄范围 1-120
    customRule: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return { errMsg: '' };
      }
      if (value < 1 || value > 120) {
        return { errMsg: '年龄必须在 1-120 之间' };
      }
      return { errMsg: '' };
    },
  },
  {
    type: 'action',
    title: '操作',
    width: 150,
    align: 'center',
    fixed: 'right',
  },
];

/**
 * 字典数据映射
 */
const optionsMap = {
  sex: [
    { dictName: '男', dictValue: '1' },
    { dictName: '女', dictValue: '0' },
  ],
};

/**
 * 表格配置
 */
const tableConfig = {
  // 启用数据备份，以支持 revertData 还原数据
  keepSource: true,
  editConfig: {
    trigger: 'manual',
    mode: 'row',
    // 关闭失焦自动清除编辑状态，只能通过保存/取消按钮控制
    autoClear: false,
  },
  rowConfig: { keyField: 'id' },
  // 必填项校验规则
  editRules: {
    name: [{ required: true }],
    sex: [{ required: false }],
    age: [{ required: true }],
  },
};

/**
 * 进入编辑态（参考 VXE-Table 官方示例）
 */
const handleEdit = (scope: any) => {
  const { row } = scope;
  const $table = tableRef.value?.getTableInstance();
  if ($table) {
    $table.setEditRow(row);
  }
};

/**
 * 保存编辑
 */
const handleSave = async (scope: any, _btn: any, helpers: any) => {
  const { row } = scope;
  const { hideLoading } = helpers;

  try {
    // 触发表格校验
    const validResult = await tableRef.value?.validate();

    if (validResult?.valid) {
      const $table = tableRef.value?.getTableInstance();

      // 模拟异步保存（实际项目中这里应该调用后端接口）
      await new Promise(resolve => setTimeout(resolve, 500));

      // 保存成功，清除编辑状态
      $table?.clearEdit();
      console.log('保存成功:', row);
    } else {
      console.warn('校验失败:', validResult);
    }
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    hideLoading?.();
  }
};

/**
 * 取消编辑（使用 revertData 还原数据）
 */
const handleCancel = async () => {
  const $table = tableRef.value?.getTableInstance();
  if ($table) {
    // 获取当前正在编辑的 row
    const editCell = $table.getEditCell();
    if (editCell) {
      const { row } = editCell;
      // 先还原数据（VXE-Table 原生方法）
      await $table.revertData(row);
      // 再清除编辑状态
      $table.clearEdit();
    }
  }
};

/**
 * 操作列配置
 */
const actionConfig: YTableActionConfig = {
  buttons: [
    {
      key: 'edit',
      text: '编辑',
      type: 'link',
      // 编辑中时隐藏"编辑"按钮
      hideFn: (scope: any) => isEditing(scope.row),
      clickFn: handleEdit,
    },
    {
      key: 'save',
      text: '保存',
      type: 'link',
      // 非编辑中时隐藏"保存"按钮
      hideFn: (scope: any) => !isEditing(scope.row),
      clickFn: handleSave,
      isConfirm: false,
      // 启用异步 loading
      confirmProps: { needLoading: true },
    },
    {
      key: 'cancel',
      text: '取消',
      type: 'link',
      // 非编辑中时隐藏"取消"按钮
      hideFn: (scope: any) => !isEditing(scope.row),
      clickFn: handleCancel,
    },
  ],
};
</script>

<template>
  <div style="padding: 12px">
    <YEditTable
      ref="tableRef"
      v-model:data="data"
      :columns="columns"
      :table-config="tableConfig"
      :options-map="optionsMap"
      :action-config="actionConfig"
      :toolbar-config="{ custom: true }"
    />
  </div>
</template>

<style scoped></style>
