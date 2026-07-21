import { ref, reactive } from 'vue';
// 注意：这里使用的是生成的 API 客户端，实际开发中请使用 pnpm sync:generate 生成
import { getPomApi } from '@/api/generated/quality';
import type { QualityRuleItem, SearchFormData, TreeNodeData } from '../constant';

/**
 * 质量规则列表数据逻辑 Hook
 * 管理列表数据、分页、搜索等
 */
export const useQualityRuleList = () => {
  /** 表格数据 */
  const tableData = ref<QualityRuleItem[]>([]);

  /** 加载状态 */
  const loading = ref(false);

  /** 分页配置 */
  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    remote: true,
  });

  /** 搜索表单数据 */
  const searchForm = reactive<SearchFormData>({
    ruleName: '',
  });

  /** 当前选中的树节点 */
  const selectedNode = ref<TreeNodeData | null>(null);

  /**
   * 获取查询参数
   */
  const getQueryParams = () => {
    const baseParams = {
      pageIndex: pagination.current,
      pageSize: pagination.pageSize,
      ruleName: searchForm.ruleName,
    };

    // 规则分类树节点
    if (selectedNode.value?.treeType === '1') {
      return {
        ...baseParams,
        dirCode: selectedNode.value.dirCode,
      };
    }

    // 数据源树节点（表节点）
    if (selectedNode.value?.treeType === '2') {
      return {
        ...baseParams,
        datasourceName: selectedNode.value.datasourceName,
        databaseName: selectedNode.value.databaseName,
        tableName: selectedNode.value.name,
      };
    }

    return baseParams;
  };

  /**
   * 获取列表数据
   */
  const fetchList = async () => {
    loading.value = true;
    try {
      const params = getQueryParams();

      // 调用 API (示例)
      const { pageQualityRule } = getPomApi();
      const { data, totalCount } = await pageQualityRule(params);

      tableData.value = (data as unknown as QualityRuleItem[]) || [];
      pagination.total = totalCount || 0;
    } catch (error) {
      console.error('查询列表失败:', error);
      tableData.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 处理分页变化
   * @param payload - 分页参数对象，包含 current 和 pageSize
   */
  const handlePageChange = (payload: { current: number; pageSize: number }) => {
    pagination.current = payload.current;
    pagination.pageSize = payload.pageSize;
    fetchList();
  };

  /**
   * 处理每页条数变化
   * @param pageSize - 新的每页条数
   */
  const handleSizeChange = (pageSize: number) => {
    pagination.current = 1;
    pagination.pageSize = pageSize;
    fetchList();
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    pagination.current = 1;
    fetchList();
  };

  /**
   * 处理刷新
   */
  const handleRefresh = () => {
    fetchList();
  };

  /**
   * 处理树节点点击
   */
  const handleTreeNodeClick = (node: TreeNodeData) => {
    selectedNode.value = node;
    pagination.current = 1;
    fetchList();
  };

  return {
    tableData,
    loading,
    pagination,
    searchForm,
    selectedNode,
    fetchList,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    handleRefresh,
    handleTreeNodeClick,
  };
};
