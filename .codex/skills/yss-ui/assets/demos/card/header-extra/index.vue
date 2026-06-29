<script setup lang="ts">
import { ref } from 'vue';
import { message, Space, Statistic, Button, Tooltip, Dropdown, Menu, Tag, Select, Row, Col } from 'ant-design-vue';
import { YCard } from '@yss-ui/components';
import './style.less';
import {
  CloudServerOutlined,
  ReloadOutlined,
  SettingOutlined,
  MoreOutlined,
  DownloadOutlined,
  HistoryOutlined,
  BellOutlined,
  DesktopOutlined,
  HddOutlined,
  DatabaseOutlined,
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ProjectOutlined,
} from '@ant-design/icons-vue';

/** 图标组件映射 */
const Icon = CloudServerOutlined;

/** 刷新状态 */
const refreshing = ref(false);

/** 时间周期选择 */
const selectedPeriod = ref('7d');

/** 服务器状态 */
const serverStatus = ref({
  text: '运行正常',
  color: 'success',
});

/** 监控指标数据 */
const metrics = ref([
  {
    key: 'cpu',
    title: 'CPU使用率',
    value: 54,
    suffix: '%',
    precision: 0,
    icon: DesktopOutlined,
    status: 'warning',
    valueColor: '#faad14',
    trend: 'up',
    trendText: '较昨日 +2.3%',
  },
  {
    key: 'memory',
    title: '内存使用率',
    value: 41.09,
    suffix: '%',
    precision: 2,
    icon: DatabaseOutlined,
    status: 'normal',
    valueColor: '#52c41a',
    trend: 'down',
    trendText: '较昨日 -1.2%',
  },
  {
    key: 'disk',
    title: '磁盘使用率',
    value: 28,
    suffix: '%',
    precision: 0,
    icon: HddOutlined,
    status: 'normal',
    valueColor: '#1890ff',
    trend: 'up',
    trendText: '较昨日 +0.8%',
  },
  {
    key: 'alerts',
    title: '告警规则',
    value: 4,
    suffix: '个',
    precision: 0,
    icon: AlertOutlined,
    status: 'error',
    valueColor: '#ff4d4f',
    trend: 'up',
    trendText: '新增 2 个',
  },
]);

/** 项目统计数据 */
const projectStats = ref([
  {
    key: 'total',
    label: '总项目数',
    value: 156,
    description: '所有项目',
    color: '#1890ff',
  },
  {
    key: 'active',
    label: '活跃项目',
    value: 89,
    description: '本周有更新',
    color: '#52c41a',
  },
  {
    key: 'pending',
    label: '待部署',
    value: 12,
    description: '等待发布',
    color: '#faad14',
  },
  {
    key: 'issues',
    label: '问题项目',
    value: 3,
    description: '需要处理',
    color: '#ff4d4f',
  },
]);

/** 处理刷新 */
const handleRefresh = async () => {
  refreshing.value = true;
  try {
    // 模拟刷新数据
    await new Promise(resolve => setTimeout(resolve, 1000));
    message.success('数据刷新成功');
  } finally {
    refreshing.value = false;
  }
};

/** 处理设置 */
const handleSettings = () => {
  message.info('打开告警阈值设置');
};

/** 处理菜单点击 */
const handleMenuClick = (info: { key: string | number }) => {
  const key = String(info.key);
  const actions: Record<string, string> = {
    export: '导出监控报告',
    history: '查看历史趋势',
    alert: '配置告警规则',
  };
  message.info(actions[key] || '未知操作');
};

/** 查看详情 */
const handleViewDetails = () => {
  message.info(`查看 ${selectedPeriod.value} 的详细统计`);
};
</script>

<template>
  <div class="header-extra-demo">
    <!-- 服务器资源监控卡片 -->
    <YCard :span="24" :gutter="16" class="resource-card">
      <template #title>
        <Space>
          <Icon />
          <span>服务器资源概览</span>
          <Tag :color="serverStatus.color" size="small">{{ serverStatus.text }}</Tag>
        </Space>
      </template>
      <template #extra>
        <Space>
          <Tooltip title="刷新数据">
            <Button type="text" size="small" :loading="refreshing" @click="handleRefresh">
              <template #icon><ReloadOutlined /></template>
            </Button>
          </Tooltip>
          <Tooltip title="设置告警阈值">
            <Button type="text" size="small" @click="handleSettings">
              <template #icon><SettingOutlined /></template>
            </Button>
          </Tooltip>
          <Dropdown>
            <template #overlay>
              <Menu @click="handleMenuClick">
                <Menu.Item key="export">
                  <DownloadOutlined />
                  导出报告
                </Menu.Item>
                <Menu.Item key="history">
                  <HistoryOutlined />
                  历史趋势
                </Menu.Item>
                <Menu.Item key="alert">
                  <BellOutlined />
                  告警配置
                </Menu.Item>
              </Menu>
            </template>
            <Button type="text" size="small">
              <template #icon><MoreOutlined /></template>
            </Button>
          </Dropdown>
        </Space>
      </template>

      <div class="metrics-grid">
        <div v-for="metric in metrics" :key="metric.key" class="metric-item">
          <div class="metric-icon" :class="`metric-${metric.status}`">
            <component :is="metric.icon" />
          </div>
          <div class="metric-content">
            <Statistic
              :title="metric.title"
              :value="metric.value"
              :suffix="metric.suffix"
              :precision="metric.precision"
              :value-style="{ color: metric.valueColor }"
            />
            <div class="metric-trend">
              <ArrowUpOutlined v-if="metric.trend === 'up'" class="trend-up" />
              <ArrowDownOutlined v-if="metric.trend === 'down'" class="trend-down" />
              <span class="trend-text">{{ metric.trendText }}</span>
            </div>
          </div>
        </div>
      </div>
    </YCard>

    <!-- 项目统计卡片 -->
    <YCard :span="24" :gutter="16" style="margin-top: 16px">
      <template #title>
        <Space>
          <ProjectOutlined />
          <span>项目统计</span>
        </Space>
      </template>
      <template #extra>
        <Space>
          <Select v-model:value="selectedPeriod" size="small" style="width: 80px">
            <Select.Option value="7d">7天</Select.Option>
            <Select.Option value="30d">30天</Select.Option>
            <Select.Option value="90d">90天</Select.Option>
          </Select>
          <Button type="primary" size="small" @click="handleViewDetails"> 查看详情 </Button>
        </Space>
      </template>

      <Row :gutter="24">
        <Col v-for="stat in projectStats" :key="stat.key" :span="6">
          <div class="stat-item">
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-desc">{{ stat.description }}</div>
          </div>
        </Col>
      </Row>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
