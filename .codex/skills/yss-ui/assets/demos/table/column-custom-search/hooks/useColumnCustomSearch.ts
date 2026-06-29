import { type YTableColumn } from '@yss-ui/components';
import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';

export interface ColumnFilterOption {
  label: string;
  value: string;
  checked?: boolean;
}

export interface UseColumnCustomSearchReturn {
  tableRef: Ref<any>;
  tableData: Ref<any[]>;
  columns: Ref<YTableColumn[]>;
  columnSearchKeywords: Ref<Record<string, string>>;
  columnAllFilters: Ref<Record<string, ColumnFilterOption[]>>;
  virtualListRefs: Ref<Record<string, any>>;
  filterPanelKeys: Ref<Record<string, number>>;
  VIRTUAL_ITEM_HEIGHT: number;
  VIRTUAL_VIEWPORT_HEIGHT: number;
  getFilteredOptions: (field: string, column: any) => ComputedRef<ColumnFilterOption[]>;
  isAllChecked: (field: string, column: any) => ComputedRef<boolean>;
  isIndeterminate: (field: string, column: any) => ComputedRef<boolean>;
  handleCheckAll: (field: string, column: any, $panel: any) => void;
  handleOptionChange: (field: string, option: any, checked: boolean, $panel: any) => void;
  handleSearchInput: (field: string) => void;
  customConfig: Ref<Record<string, any>>;
  virtualXConfig: Ref<{ enabled: boolean; gt: number }>;
  virtualYConfig: Ref<{ enabled: boolean; gt: number }>;
  rowConfig: Ref<Record<string, any>>;
}

/**
 * 列筛选 + 搜索 + 虚拟列表 Demo 逻辑（拆分为 hook）
 * @returns Demo 所需的响应式状态与方法
 */
export const useColumnCustomSearch = (): UseColumnCustomSearchReturn => {
  const tableRef = ref<any>();

  /** 从数据中提取某列唯一值（去重后升序） */
  const getUniqueValues = (data: any[], field: string): string[] => {
    const values = data.map(row => String(row[field] || ''));
    return Array.from(new Set(values)).sort();
  };

  // 构造 1000+ 行示例数据（配合固定高度触发虚拟滚动）
  const tableData = ref<any[]>([]);
  for (let r = 0; r < 1200; r += 1) {
    const row: Record<string, any> = { _X_ROW_KEY: `row_${r}` };
    for (let c = 1; c <= 70; c += 1) {
      // 模拟第三列部分字段为空（每隔3行或行号能被5整除时为空）
      if (c === 3 && (r % 3 === 0 || r % 5 === 0)) {
        row[`col${c}`] = '';
      } else {
        row[`col${c}`] = `内容${r + 1}-${c}`;
      }
    }
    tableData.value.push(row);
  }

  // 每列的搜索关键词、完整筛选项
  const columnSearchKeywords = ref<Record<string, string>>({});
  const columnAllFilters = ref<Record<string, ColumnFilterOption[]>>({});

  // VirtualList 实例映射：按列字段保存，用于重置滚动
  const virtualListRefs = ref<Record<string, any>>({});
  // 筛选面板强制刷新 key（用于解决单选状态不同步问题）
  const filterPanelKeys = ref<Record<string, number>>({});

  // 虚拟列表参数（改用 antdv vc-virtual-list）
  const VIRTUAL_ITEM_HEIGHT = 32; // 单项高度（px）
  const VIRTUAL_VIEWPORT_HEIGHT = 240; // 可视高度（与样式一致）

  // 生成 70 列示例（含序号列），每列都启用筛选
  const columns = ref<YTableColumn[]>([
    { type: 'seq' as const, title: '序号', width: 60, align: 'center', fixed: 'left' },
  ]);

  // 为每列生成筛选选项
  for (let i = 0; i < 70; i += 1) {
    const field = `col${i + 1}`;
    const uniqueValues = getUniqueValues(tableData.value, field);
    const filters: ColumnFilterOption[] = uniqueValues.map(value => ({ label: value, value }));

    columnAllFilters.value[field] = filters;
    columnSearchKeywords.value[field] = '';
    filterPanelKeys.value[field] = 0;

    // 数据处理 第三列留一列不显示 其他列都显示
    if (i === 2) {
      // 不展示数据
      columns.value.push({
        field,
        title: `备注${i + 1}`,
        width: 120,
        filterable: true,
        filterMultiple: true,
        filters,
      });
    } else {
      columns.value.push({
        field,
        title: `备注${i + 1}`,
        width: 120,
        filterable: true,
        filterMultiple: true,
        filters,
      });
    }
  }

  /** 获取某列过滤后的选项（根据搜索关键词） */
  const getFilteredOptions = (field: string, column: any) => {
    return computed<ColumnFilterOption[]>(() => {
      const keyword = columnSearchKeywords.value[field]?.trim().toLowerCase() || '';
      const allFilters = (column?.filters as ColumnFilterOption[]) || columnAllFilters.value[field] || [];

      if (!keyword) return allFilters;
      return allFilters.filter(filter =>
        String(filter.label || '')
          .toLowerCase()
          .includes(keyword)
      );
    });
  };

  /** 是否全选 */
  const isAllChecked = (field: string, column: any) => {
    return computed<boolean>(() => {
      const filteredOptions = getFilteredOptions(field, column).value;
      if (filteredOptions.length === 0) return false;
      return filteredOptions.every(opt => (opt as any).checked);
    });
  };

  /** 是否半选 */
  const isIndeterminate = (field: string, column: any) => {
    return computed<boolean>(() => {
      const filteredOptions = getFilteredOptions(field, column).value;
      const checkedCount = filteredOptions.filter(opt => (opt as any).checked).length;
      return checkedCount > 0 && checkedCount < filteredOptions.length;
    });
  };

  /** 全选/取消全选 */
  const handleCheckAll = (field: string, column: any, $panel: any) => {
    const filteredOptions = getFilteredOptions(field, column).value;
    const allChecked = isAllChecked(field, column).value;
    filteredOptions.forEach((option: any) => {
      option.checked = !allChecked; // 更新可视状态
      $panel.changeOption(null, option.checked, option); // 同步 vxe 内部状态
    });
  };

  /** 单个选项变化 */
  const handleOptionChange = (field: string, option: any, checked: boolean, $panel: any) => {
    // 1. 保存当前滚动位置
    const list = virtualListRefs.value[field];
    let scrollOffset = 0;
    if (list && list.scrollTo) {
      // 尝试获取当前滚动偏移量
      const listElement = list.$el || list;
      if (listElement && listElement.querySelector) {
        const scrollContainer = listElement.querySelector('.rc-virtual-list-holder');
        if (scrollContainer) {
          scrollOffset = scrollContainer.scrollTop || 0;
        }
      }
    }

    // 2. 更新选项状态
    option.checked = checked;
    $panel.changeOption(null, checked, option);
    filterPanelKeys.value[field] = (filterPanelKeys.value[field] || 0) + 1; // 强制刷新

    // 3. 在 DOM 更新后恢复滚动位置
    nextTick(() => {
      const list = virtualListRefs.value[field];
      if (list && scrollOffset > 0) {
        const listElement = list.$el || list;
        if (listElement && listElement.querySelector) {
          const scrollContainer = listElement.querySelector('.rc-virtual-list-holder');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollOffset;
          }
        }
      }
    });
  };

  /** 搜索输入时：重置该列虚拟列表滚动到顶部 */
  const handleSearchInput = (field: string) => {
    const list = virtualListRefs.value[field];
    if (list && typeof list.scrollTo === 'function') {
      list.scrollTo({ index: 0 });
    }
  };

  // 仅保留"字段显隐"的列设置（禁用排序与固定）
  const customConfig = ref({
    allowFixed: false,
    allowSort: false,
    storage: {
      enabled: true,
      key: 'yss-ui:table:demo-column-custom-search:columns',
    },
  });

  /** 虚拟滚动配置 (vxe-table v4.10.6+ 使用 virtual-x-config / virtual-y-config) */
  const virtualXConfig = ref({ enabled: true, gt: 60 });
  const virtualYConfig = ref({ enabled: true, gt: 100 });

  /** 行配置 - 行标识配置 */
  const rowConfig = ref({ keyField: '_X_ROW_KEY', useKey: true });

  return {
    tableRef,
    tableData,
    columns,
    columnSearchKeywords,
    columnAllFilters,
    virtualListRefs,
    filterPanelKeys,
    VIRTUAL_ITEM_HEIGHT,
    VIRTUAL_VIEWPORT_HEIGHT,
    getFilteredOptions,
    isAllChecked,
    isIndeterminate,
    handleCheckAll,
    handleOptionChange,
    handleSearchInput,
    customConfig,
    virtualXConfig,
    virtualYConfig,
    rowConfig,
  };
};
