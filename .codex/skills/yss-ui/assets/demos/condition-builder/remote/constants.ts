import type { ConditionGroup } from '@yss-ui/components';
export const createInitial = (): ConditionGroup => ({
  id: 'root',
  type: 'GROUP',
  logicalOp: 'AND',
  children: [],
});
