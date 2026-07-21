import { message, Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { getPomApi } from '@/api/generated/quality';
import { RULE_TYPE } from '@/constant'; // 假设项目根目录有全局常量
import type { QualityRuleItem, TreeNodeData } from '../constant';

/**
 * 质量规则操作逻辑 Hook
 * 处理编辑、删除、运行、状态切换等操作
 */
export const useRuleActions = (refreshList: () => void) => {
  const router = useRouter();

  /**
   * 处理编辑规则
   * @param row 规则数据行
   */
  const handleEdit = (row: QualityRuleItem) => {
    router.push({
      path: '/biz/rules/create',
      query: {
        id: row.id,
        formMode: 1,
        qualityType: RULE_TYPE.BUSINESS,
      },
    });
  };

  /**
   * 处理删除规则
   * @param row 规则数据行
   */
  const handleDelete = async (row: QualityRuleItem) => {
    try {
      const { deleteQualityRule } = getPomApi();
      await deleteQualityRule({ ids: [row.id] } as any);
      message.success('删除成功');
      refreshList();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  /**
   * 处理运行规则
   * @param row 规则数据行
   */
  const handleRun = async (row: QualityRuleItem) => {
    try {
      const { executeQualityCheck } = getPomApi();
      await executeQualityCheck({
        ruleCode: row.ruleCode || row.id,
        qualityType: 'BUSINESS',
      });

      message.success('运行成功');
    } catch (error) {
      console.error('运行失败:', error);
    }
  };

  /**
   * 处理状态切换
   * @param row 规则数据行
   */
  const handleStatusChange = async (row: QualityRuleItem) => {
    const text = row.status === 1 ? '禁用' : '启用';
    Modal.confirm({
      title: `确认${text}`,
      content: `确认${text}此规则吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const newStatus = row.status === 1 ? 0 : 1;
          const { qualityRuleEnabled } = getPomApi();
          await qualityRuleEnabled({
            id: Number(row.id),
            status: newStatus,
          });
          message.success(`${text}成功`);
          refreshList();
        } catch (error) {
          console.error(`${text}失败:`, error);
        }
      },
    });
  };

  /**
   * 处理新建规则
   * @param selectedNode 当前选中的树节点
   */
  const handleCreate = (selectedNode: TreeNodeData | null) => {
    const query: any = {
      qualityType: 'BUSINESS',
    };

    if (selectedNode) {
      if (selectedNode.treeType === '1') {
        // 规则分类树节点
        query.dirCode = selectedNode.dirCode;
      } else if (selectedNode.treeType === '2') {
        // 数据源树节点
        query.datasourceName = selectedNode.datasourceName;
        query.databaseName = selectedNode.databaseName;
        query.dataBaseType = selectedNode.dataBaseType;
      }
    }

    router.push({
      path: '/biz/rules/create',
      query,
    });
  };

  /**
   * 处理规则名称点击（跳转详情页）
   * @param row 规则数据行
   */
  const handleRuleNameClick = (row: QualityRuleItem) => {
    router.push({
      path: '/rules/detail',
      query: {
        id: row.id,
        templateId: row.templateId,
        qualityType: RULE_TYPE.BUSINESS,
        ruleCode: row.ruleCode,
      },
    });
  };

  return {
    handleEdit,
    handleDelete,
    handleRun,
    handleStatusChange,
    handleCreate,
    handleRuleNameClick,
  };
};
