// Replace these examples with cases derived from the existing state matrix.
window.prototypeScenarios = [
  { id: 'primary', label: '正常保存', content: '待编辑内容', outcome: 'success' },
  { id: 'failure', label: '保存失败后重试', content: '失败后应保留的输入', outcome: 'failure' },
  { id: 'no-permission', label: '无编辑权限', content: '可查看的内容', outcome: 'no-permission' },
  { id: 'conflict', label: '内容冲突后重新加载', content: '本地待保存内容', outcome: 'conflict' }
];
