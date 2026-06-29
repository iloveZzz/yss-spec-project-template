<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { YMonaco, YButton } from '@yss-ui/components';
import { Space, Tag, Alert, Select, Spin, message } from 'ant-design-vue';
import {
  ReloadOutlined,
  ClearOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';
import { initializeLog, fetchHistoryLogs, generateRealtimeLog, formatLogEntry, type LogLevel } from './mock/mockLogApi';

/**
 * 历史日志加载器示例
 * - 初始化加载最新日志
 * - 向上滚动到顶部加载历史日志
 * - 支持日志等级筛选
 * - 支持自动刷新最新日志
 * - 精致的交互体验
 */

const monacoRef = ref<any>(null);
const isLoading = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const totalLoaded = ref(0);
const selectedLevels = ref<LogLevel[]>([]);
const autoRefresh = ref(false);
const isInitialized = ref(false);

let autoRefreshTimer: number | null = null;
const historyLogLoader: any = null;
let lastFirstVisibleLine = -1; // 记录上次的滚动位置，用于防止重复触发

/** 日志等级选项 */
const levelOptions = [
  { label: 'INFO', value: 'INFO', color: 'blue' },
  { label: 'WARN', value: 'WARN', color: 'orange' },
  { label: 'ERROR', value: 'ERROR', color: 'red' },
  { label: 'DEBUG', value: 'DEBUG', color: 'green' },
];

/** 过滤后的日志内容 */
const filteredContent = ref('');
const originalLogs = ref<Array<{ level: LogLevel; text: string }>>([]);

/**
 * 初始化日志
 */
const initializeLogs = async () => {
  if (isLoading.value) return;

  isLoading.value = true;
  isInitialized.value = false;
  currentPage.value = 1;
  hasMore.value = true;
  totalLoaded.value = 0;
  originalLogs.value = [];

  try {
    const response = await initializeLog(50);
    const content = response.data.map(formatLogEntry).join('\n');

    // 保存原始日志
    originalLogs.value = response.data.map(log => ({
      level: log.level,
      text: formatLogEntry(log),
    }));

    filteredContent.value = content;
    monacoRef.value?.setValue(content);
    totalLoaded.value = response.data.length;
    hasMore.value = response.hasMore;
    isInitialized.value = true;

    // 滚动到底部显示最新日志
    setTimeout(() => {
      monacoRef.value?.scrollToBottom();
    }, 100);

    message.success(`加载了 ${response.data.length} 条最新日志`);
  } catch (error) {
    message.error('加载日志失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 加载历史日志
 */
const loadHistoryLogs = async () => {
  if (isLoading.value || !hasMore.value || !isInitialized.value) {
    return;
  }

  isLoading.value = true;

  try {
    const nextPage = currentPage.value + 1;
    const response = await fetchHistoryLogs(nextPage, 50);

    if (response.data.length > 0) {
      // 保存历史日志到原始日志数组（插入到前面）
      const historyLogs = response.data.map(log => ({
        level: log.level,
        text: formatLogEntry(log),
      }));

      originalLogs.value = [...historyLogs, ...originalLogs.value];

      // 应用过滤（保持滚动位置，并传递新增行数）
      applyFilter(true, historyLogs.length);

      currentPage.value = nextPage;
      hasMore.value = response.hasMore;
      totalLoaded.value = originalLogs.value.length;

      message.success(`加载了 ${response.data.length} 条历史日志`);
    }

    if (!response.hasMore) {
      message.info('已加载全部历史日志');
    }
  } catch (error) {
    message.error('加载历史日志失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 应用日志等级过滤
 */
const applyFilter = (shouldPreserveScroll = false, newLinesAdded = 0) => {
  const editor = monacoRef.value?.getInstance?.();
  if (!editor) return;

  let scrollTop = 0;
  let firstVisibleLine = 1;

  // 保存当前滚动位置
  if (shouldPreserveScroll) {
    scrollTop = editor.getScrollTop();
    const visibleRanges = editor.getVisibleRanges();
    if (visibleRanges && visibleRanges.length > 0) {
      firstVisibleLine = visibleRanges[0].startLineNumber;
    }
  }

  // 应用过滤
  if (selectedLevels.value.length === 0) {
    // 未选择过滤，显示全部
    filteredContent.value = originalLogs.value.map(log => log.text).join('\n');
  } else {
    // 按等级过滤
    const filtered = originalLogs.value.filter(log => selectedLevels.value.includes(log.level));
    filteredContent.value = filtered.map(log => log.text).join('\n');
  }

  monacoRef.value?.setValue(filteredContent.value);

  // 恢复滚动位置
  if (shouldPreserveScroll && newLinesAdded > 0) {
    // 加载历史日志时，将滚动位置设置到新加载内容的中间位置
    // 这样用户可以看到新内容，又能继续向上滚动
    setTimeout(() => {
      const targetLine = Math.floor(newLinesAdded / 2) + 15; // 新内容的中间位置 + 15行偏移
      editor.revealLineInCenter(targetLine);
    }, 50);
  } else if (shouldPreserveScroll) {
    // 其他情况保持原有滚动位置
    setTimeout(() => {
      editor.revealLineInCenter(firstVisibleLine);
      editor.setScrollTop(scrollTop);
    }, 50);
  }
};

/**
 * 等级过滤变化
 */
const handleLevelChange = () => {
  applyFilter();
};

/**
 * 清空过滤
 */
const clearFilter = () => {
  selectedLevels.value = [];
  applyFilter();
};

/**
 * 滚动到顶部事件
 */
const handleScrollTop = () => {
  loadHistoryLogs();
};

/**
 * 清空日志
 */
const clearLogs = () => {
  monacoRef.value?.setValue('');
  originalLogs.value = [];
  filteredContent.value = '';
  currentPage.value = 1;
  hasMore.value = true;
  totalLoaded.value = 0;
  isInitialized.value = false;
  message.success('已清空日志');
};

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  monacoRef.value?.scrollToBottom();
};

/**
 * 滚动到顶部
 */
const scrollToTop = () => {
  const editor = monacoRef.value?.getInstance?.();
  editor?.revealLine(1);
};

/**
 * 切换自动刷新
 */
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;

  if (autoRefresh.value) {
    startAutoRefresh();
    message.success('已开启自动刷新（每 5 秒）');
  } else {
    stopAutoRefresh();
    message.info('已关闭自动刷新');
  }
};

/**
 * 开始自动刷新
 */
const startAutoRefresh = () => {
  if (autoRefreshTimer) return;

  autoRefreshTimer = window.setInterval(() => {
    if (!isInitialized.value) return;

    // 模拟新日志产生
    const newLog = generateRealtimeLog();
    const logText = formatLogEntry(newLog);

    // 添加到原始日志
    originalLogs.value.push({
      level: newLog.level,
      text: logText,
    });

    totalLoaded.value = originalLogs.value.length;

    // 如果未过滤或新日志符合过滤条件，追加到编辑器
    if (selectedLevels.value.length === 0 || selectedLevels.value.includes(newLog.level)) {
      monacoRef.value?.appendContent('\n' + logText);
    }
  }, 5000); // 每 5 秒
};

/**
 * 停止自动刷新
 */
const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

/**
 * 状态标签颜色
 */
const statusColor = computed(() => {
  if (isLoading.value) return 'orange';
  if (!hasMore.value) return 'green';
  return 'blue';
});

/**
 * 状态文本
 */
const statusText = computed(() => {
  if (isLoading.value) return '加载中...';
  if (!hasMore.value) return '已加载全部';
  return '可继续加载';
});

/**
 * 绑定滚动监听
 */
const bindScrollListener = () => {
  // 使用轮询等待编辑器实例准备就绪
  let retryCount = 0;
  const maxRetries = 30; // 最多重试 30 次（3 秒）
  let scrollDisposable: any = null;

  const tryBindScrollListener = () => {
    const editor = monacoRef.value?.getInstance?.();

    if (editor) {
      // 监听滚动事件
      let scrollTimer: number | null = null;

      scrollDisposable = editor.onDidScrollChange(() => {
        // 清除之前的定时器
        if (scrollTimer) {
          clearTimeout(scrollTimer);
        }

        // 使用防抖，避免频繁触发
        scrollTimer = window.setTimeout(() => {
          if (!isInitialized.value || isLoading.value || !hasMore.value) {
            return;
          }

          const visibleRanges = editor.getVisibleRanges();
          if (!visibleRanges || visibleRanges.length === 0) {
            return;
          }

          const firstVisibleLine = visibleRanges[0].startLineNumber;
          const totalLines = editor.getModel()?.getLineCount() || 0;

          // 计算滚动百分比
          // const scrollPercent = totalLines > 0 ? (firstVisibleLine / totalLines) * 100 : 0;

          // 滚动到前 3% 或前 10 行时触发加载
          const isNearTop = firstVisibleLine <= Math.max(10, totalLines * 0.03);

          // 只有在向上滚动（firstVisibleLine 变小）且接近顶部时才触发
          const isScrollingUp = lastFirstVisibleLine === -1 || firstVisibleLine < lastFirstVisibleLine;

          if (isNearTop && isScrollingUp && firstVisibleLine !== lastFirstVisibleLine) {
            lastFirstVisibleLine = firstVisibleLine;
            handleScrollTop();
          } else if (firstVisibleLine !== lastFirstVisibleLine) {
            // 更新位置记录，但不触发加载
            lastFirstVisibleLine = firstVisibleLine;
          }
        }, 200); // 200ms 防抖
      });

      // 清理监听器
      onBeforeUnmount(() => {
        scrollDisposable?.dispose?.();
      });

      return true; // 绑定成功
    }

    // 未获取到编辑器实例，继续重试
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(tryBindScrollListener, 100); // 每 100ms 重试一次
    } else {
      console.error('❌ 无法获取编辑器实例，已达最大重试次数');
    }

    return false;
  };

  // 延迟 500ms 后开始尝试绑定（给编辑器初始化留出时间）
  setTimeout(tryBindScrollListener, 500);
};

// 组件挂载后初始化
onMounted(() => {
  // 初始化日志
  initializeLogs();

  // 绑定滚动监听
  bindScrollListener();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
  historyLogLoader?.dispose?.();
});
</script>

<template>
  <div class="history-log-viewer-demo">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-left">
        <Space>
          <y-button type="primary" :loading="isLoading" @click="initializeLogs">
            <template #icon><ReloadOutlined /></template>
            {{ isInitialized ? '刷新' : '初始化' }}
          </y-button>
          <y-button :disabled="!isInitialized" @click="clearLogs">
            <template #icon><ClearOutlined /></template>
            清空日志
          </y-button>
          <y-button :disabled="!isInitialized" @click="scrollToTop">
            <template #icon><ArrowUpOutlined /></template>
            回到顶部
          </y-button>
          <y-button :disabled="!isInitialized" @click="scrollToBottom">
            <template #icon><ArrowDownOutlined /></template>
            到底部
          </y-button>
          <y-button
            :type="autoRefresh ? 'primary' : 'default'"
            :danger="autoRefresh"
            :disabled="!isInitialized"
            @click="toggleAutoRefresh"
          >
            <template #icon><ClockCircleOutlined /></template>
            {{ autoRefresh ? '停止刷新' : '自动刷新' }}
          </y-button>
        </Space>
      </div>

      <div class="control-right">
        <Space>
          <!-- 等级筛选 -->
          <Select
            v-model:value="selectedLevels"
            mode="multiple"
            placeholder="选择日志等级筛选"
            style="min-width: 200px"
            :options="levelOptions"
            :disabled="!isInitialized"
            @change="handleLevelChange"
          >
            <template #suffixIcon><FilterOutlined /></template>
          </Select>
          <y-button v-if="selectedLevels.length > 0" @click="clearFilter"> 清除筛选 </y-button>
        </Space>
      </div>
    </div>

    <!-- 状态指示器 -->
    <div class="status-bar">
      <Space :size="12">
        <Tag :color="statusColor">
          <template v-if="isLoading">
            <Spin :indicator="{ indicator: 'loading' }" size="small" /> {{ statusText }}
          </template>
          <template v-else-if="!hasMore"> <CheckCircleOutlined /> {{ statusText }} </template>
          <template v-else>
            {{ statusText }}
          </template>
        </Tag>
        <Tag color="blue">总日志: {{ totalLoaded }}</Tag>
        <Tag color="cyan">当前页: {{ currentPage }}</Tag>
        <Tag v-if="selectedLevels.length > 0" color="purple"> 筛选: {{ selectedLevels.join(', ') }} </Tag>
        <Tag v-if="autoRefresh" color="orange"> <span class="blinking-dot">●</span> 实时刷新 </Tag>
      </Space>
    </div>

    <!-- 日志编辑器 -->
    <div class="log-container">
      <YMonaco
        ref="monacoRef"
        :model-value="filteredContent"
        language="shell"
        :height="500"
        :readonly="true"
        :toolbar-options="{ download: true }"
        :options="{
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          wordWrap: 'off',
          automaticLayout: true,
        }"
      />
    </div>

    <!-- 使用说明 -->
    <div class="tips">
      <Alert type="info" show-icon>
        <template #message>
          <strong>功能说明</strong>
        </template>
        <template #description>
          <ul>
            <li>✅ <strong>初始化加载</strong>：首次点击"初始化"按钮加载最新 50 条日志</li>
            <li>✅ <strong>向上滚动加载</strong>：滚动到顶部（前 5 行）自动加载历史日志</li>
            <li>✅ <strong>分页机制</strong>：每次加载 50 条，直到加载完所有历史日志（共 500 条）</li>
            <li>✅ <strong>等级筛选</strong>：支持按 INFO/WARN/ERROR/DEBUG 筛选日志</li>
            <li>✅ <strong>自动刷新</strong>：开启后每 5 秒自动生成新日志</li>
            <li>
              ✅ <strong>内置搜索</strong>：使用 <code>Cmd+F</code> (Mac) 或 <code>Ctrl+F</code> (Windows)
              快捷键搜索日志内容
            </li>
            <li>💡 模拟真实接口延迟（300-800ms），提供逼真的加载体验</li>
          </ul>
        </template>
      </Alert>
    </div>
  </div>
</template>

<style scoped lang="less">
.history-log-viewer-demo {
  .control-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);

    .control-left,
    .control-right {
      display: flex;
      align-items: center;
    }
  }

  .status-bar {
    margin-bottom: 12px;
    padding: 12px 16px;
    background: #f7f9fc;
    border-radius: 6px;
    border: 1px solid #e1e8ed;

    .blinking-dot {
      animation: blink 1.5s infinite;
    }
  }

  .log-container {
    position: relative;
    margin-bottom: 16px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .tips {
    ul {
      margin: 8px 0 0 0;
      padding-left: 20px;

      li {
        margin-bottom: 6px;
        line-height: 1.8;
      }

      code {
        padding: 2px 6px;
        background: #f0f0f0;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
        color: #d63384;
      }
    }
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
