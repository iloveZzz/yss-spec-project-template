window.prototypeScenarios = [
  { id: 'primary', label: '正常操作', outcome: 'success' },
  { id: 'failure', label: '失败后重试', outcome: 'failure' },
  { id: 'no-permission', label: '无操作权限', outcome: 'no-permission' },
  { id: 'conflict', label: '版本冲突', outcome: 'conflict' }
];
window.craftData = [
  { id: 'M-001', name: '季度经营分析资料', owner: '张明', status: '待核对', note: '用于本季度经营分析，需核对归属部门。' },
  { id: 'M-002', name: '跨部门业务协作与异常处理说明（长名称示例）', owner: '李华', status: '待核对', note: '包含跨部门协作信息，请核对完整名称与负责人。' },
  { id: 'M-003', name: '归档清单', owner: '', status: '已更新', note: '负责人尚未填写。' }
];
