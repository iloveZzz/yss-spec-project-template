import { computed } from 'vue';
import { message } from 'ant-design-vue';
import type { YTableActionConfig } from '@yss-ui/components';
import { getApiApi } from '@/api/generated/quality';
import type { QualityRuleItem } from '../constant';

const { deleteQualityRule } = getApiApi();

/** 行操作与页面容器的通信回调。 */
export interface RuleActionCallbacks {
  refreshList: () => Promise<void>;
  onCreate: () => void;
  onEdit: (row: QualityRuleItem) => void;
  onView: (row: QualityRuleItem) => void;
}

/** YTable 气泡确认助手。 */
interface ActionHelpers {
  close: () => void;
  hideLoading: () => void;
}

/** 管理质量规则行操作和 YTable 操作列配置。 */
export const useRuleActions = (callbacks: RuleActionCallbacks) => {
  /** 删除规则并刷新列表。 */
  const handleDelete = async (row: QualityRuleItem): Promise<void> => {
    if (!row.id) return;

    try {
      await deleteQualityRule(row.id);
      message.success('删除成功');
      await callbacks.refreshList();
    } catch {
      // mutator 已展示错误，此处不重复 message.error。
    }
  };

  /** 标准操作列：查看/编辑立即执行，删除使用气泡确认。 */
  const actionConfig = computed<YTableActionConfig>(() => ({
    title: '操作',
    width: 180,
    fixed: 'right',
    buttons: [
      { label: '查看', value: 'view', click: ({ row }) => callbacks.onView(row) },
      { label: '编辑', value: 'edit', click: ({ row }) => callbacks.onEdit(row) },
      {
        label: '删除',
        value: 'delete',
        type: 'link',
        isConfirm: true,
        confirmProps: { title: '确认删除此规则吗？删除后无法恢复', needLoading: true },
        click: async ({ row }, _button, helpers: ActionHelpers) => {
          try {
            await handleDelete(row);
          } finally {
            helpers.hideLoading();
            helpers.close();
          }
        },
      },
    ],
  }));

  return { actionConfig, handleCreate: callbacks.onCreate };
};
