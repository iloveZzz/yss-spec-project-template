import type { EChartsCoreOption } from 'echarts';

/** CPU仪表盘配置 */
export const createCpuGaugeOption = (): EChartsCoreOption => ({
  series: [
    {
      type: 'gauge',
      progress: { show: true },
      center: ['50%', '55%'], // 可以微调Y轴位置，让其在垂直方向上更居中
      radius: '85%', // 增大半径，使仪表盘更大
      detail: { valueAnimation: true, formatter: '{value}%' },
      data: [{ value: 65, name: '处理器' }],
    },
  ],
});

/** 磁盘仪表盘配置 */
export const createDiskGaugeOption = (): EChartsCoreOption => ({
  series: [
    {
      type: 'gauge',
      progress: { show: true },
      center: ['50%', '55%'], // 可以微调Y轴位置，让其在垂直方向上更居中
      radius: '85%', // 增大半径，使仪表盘更大
      itemStyle: {
        color: '#5cb85c',
        shadowColor: 'rgba(92,184,92,0.45)',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      },
      detail: { valueAnimation: true, formatter: '{value}%' },
      data: [
        {
          value: 57,
          name: '内存',
        },
      ],
    },
  ],
});

/** 线程统计数据 */
export const THREAD_STATS_DATA = {
  total: 95,
  details: [
    { label: '定时等待', value: 20, color: '#ff6b6b' },
    { label: '新线程', value: 20, color: '#4ecdc4' },
    { label: '运行中', value: 20, color: '#45b7d1' },
    { label: '等待', value: 20, color: '#f9ca24' },
    { label: '阻塞', value: 20, color: '#f0932b' },
    { label: '中断', value: 20, color: '#eb4d4b' },
  ],
};

/** 磁盘使用信息 */
export const DISK_USAGE_INFO = {
  used: 23,
  total: 100,
  unit: 'GB',
};
