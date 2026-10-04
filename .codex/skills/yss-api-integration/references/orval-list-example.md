## 标准代码骨架

以微应用的真实 `getApiApi()` 产物为例：

```typescript
import { reactive, ref } from 'vue';
import { getApiApi } from '@/api/generated/quality';
import type { QualityBusinessRuleVO, QualityRulePage } from '@/api/generated/quality/schemas';

const { pageQualityRule } = getApiApi();

/** 管理质量规则列表请求和分页状态。 */
export const useQualityRuleList = () => {
  const loading = ref(false);
  const dataList = ref<QualityBusinessRuleVO[]>([]);
  const query = reactive<QualityRulePage>({ pageIndex: 1, pageSize: 20, ruleName: '' });
  const total = ref(0);

  /** 加载规则列表。 */
  const fetchData = async (): Promise<void> => {
    loading.value = true;
    try {
      const res = await pageQualityRule(query);
      dataList.value = res.data ?? [];
      total.value = res.totalCount ?? 0;
    } catch {
      dataList.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  };

  return { loading, dataList, query, total, fetchData };
};
```

> 如果所在项目已生成 `pageQualityRule` 具名导出，直接导入该函数，删除上面的工厂实例行。
