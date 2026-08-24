import { reactive, ref } from 'vue';
import { getApiApi } from '@/api/generated/quality';
import type { QualityRulePage } from '@/api/generated/quality/schemas';
import type { QualityRuleItem, SearchFormData } from '../constant';

const { pageQualityRule } = getApiApi();

/** 管理质量规则列表、查询和远程分页。 */
export const useQualityRuleList = () => {
  const tableData = ref<QualityRuleItem[]>([]);
  const loading = ref(false);
  const pagination = reactive({ current: 1, pageSize: 20, total: 0, remote: true });
  const searchForm = reactive<SearchFormData>({ ruleName: '' });

  /** 组装 Orval 查询 DTO。 */
  const getQueryParams = (): QualityRulePage => ({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    ruleName: searchForm.ruleName || undefined,
  });

  /** 加载列表；错误提示由 mutator 统一处理。 */
  const fetchList = async (): Promise<void> => {
    loading.value = true;
    try {
      const res = await pageQualityRule(getQueryParams());
      tableData.value = res.data ?? [];
      pagination.total = res.totalCount ?? 0;
    } catch {
      tableData.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  };

  /** 处理分页变化。 */
  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }): void => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    void fetchList();
  };

  /** 从第一页执行查询。 */
  const handleSearch = (): void => {
    pagination.current = 1;
    void fetchList();
  };

  /** 重置查询条件并刷新。 */
  const handleReset = (): void => {
    searchForm.ruleName = '';
    pagination.current = 1;
    void fetchList();
  };

  return { tableData, loading, pagination, searchForm, fetchList, handlePageChange, handleSearch, handleReset };
};
