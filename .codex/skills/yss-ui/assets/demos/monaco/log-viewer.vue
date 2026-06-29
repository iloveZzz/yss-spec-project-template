<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { YMonaco, YButton } from '@yss-ui/components';
import { Space, Tag, Alert } from 'ant-design-vue';
import { PlayCircleOutlined, PauseCircleOutlined, ClearOutlined, ArrowDownOutlined } from '@ant-design/icons-vue';

/**
 * 日志查看器示例
 * - 模拟服务日志增量加载
 * - 滚动到底部触发加载更多
 * - 行数限制与自动清理
 *
 * 语言选择说明：
 * - 使用 'shell' 可高亮路径、IP、数字等常见日志元素
 * - 也可使用 'plaintext' 作为纯文本显示
 */

const monacoRef = ref<any>(null);
const isStreaming = ref(false);
const logCount = ref(0);
const totalLines = ref(0);
let streamTimer: number | null = null;
let batchCounter = 1;

/** 日志类型枚举 */
const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

/** 生成随机日志内容 */
const generateLogLine = (): string => {
  const timestamp = new Date().toISOString();
  const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
  const messages = [
    'Request processed successfully',
    'Database connection established',
    'Cache miss for key: user_session_12345',
    'API call to external service completed',
    'Background task executed',
    'User authentication successful',
    'File upload completed: document.pdf',
    'Email notification sent',
    'Memory usage: 1024MB / 2048MB',
    'Transaction committed successfully',
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const threadId = Math.floor(Math.random() * 100);

  return `[${timestamp}] [${level}] [Thread-${threadId}] ${message}`;
};

/** 开始模拟日志流 */
const startLogStream = () => {
  if (isStreaming.value) return;

  isStreaming.value = true;
  logCount.value = 0;

  streamTimer = window.setInterval(() => {
    if (!monacoRef.value) {
      console.warn('⚠️ monacoRef.value 为 null');
      return;
    }

    // 每次追加 5-10 行日志
    const linesToAdd = Math.floor(Math.random() * 6) + 5;
    const logs = [];

    for (let i = 0; i < linesToAdd; i++) {
      logs.push(generateLogLine());
      logCount.value++;
    }

    const content = logs.join('\n');
    console.log(`📝 准备追加 ${linesToAdd} 行日志，总计 ${content.length} 字符`);

    monacoRef.value.appendContent(content);
    totalLines.value = monacoRef.value.getLineCount();

    console.log(`📊 当前行数: ${totalLines.value}`);
  }, 500); // 每 500ms 追加一批
};

/** 停止日志流 */
const stopLogStream = () => {
  if (streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
  isStreaming.value = false;
};

/** 清空日志 */
const clearLogs = () => {
  stopLogStream();
  monacoRef.value?.clearContent();
  logCount.value = 0;
  totalLines.value = 0;
  batchCounter = 1;
};

/** 手动滚动到底部 */
const scrollToBottom = () => {
  monacoRef.value?.scrollToBottom();
};

/** 滚动到底部事件处理 */
const handleScrollEnd = () => {
  console.log('📍 滚动到底部，模拟加载更多...');

  if (!monacoRef.value || !isStreaming.value) return;

  // 模拟从后端请求更多日志
  const moreLogs = [];
  for (let i = 0; i < 20; i++) {
    moreLogs.push(generateLogLine());
    logCount.value++;
  }

  monacoRef.value.appendContent(`\n--- 批次 ${batchCounter++} ---\n${moreLogs.join('\n')}`);
  totalLines.value = monacoRef.value.getLineCount();
};

/** 行数超出限制事件处理 */
const handleLineExceed = (lines: number) => {
  console.log(`⚠️ 日志行数超出限制：${lines} 行，已自动清理`);
};

onBeforeUnmount(() => {
  stopLogStream();
});
</script>

<template>
  <div class="log-viewer-demo">
    <div class="control-panel">
      <Space>
        <y-button v-if="!isStreaming" type="primary" @click="startLogStream">
          <template #icon><PlayCircleOutlined /></template>
          开始模拟日志流
        </y-button>
        <y-button v-else danger @click="stopLogStream">
          <template #icon><PauseCircleOutlined /></template>
          停止日志流
        </y-button>
        <y-button @click="clearLogs">
          <template #icon><ClearOutlined /></template>
          清空日志
        </y-button>
        <y-button @click="scrollToBottom">
          <template #icon><ArrowDownOutlined /></template>
          滚动到底部
        </y-button>
      </Space>

      <div class="stats">
        <Tag color="blue">总日志数: {{ logCount }}</Tag>
        <Tag color="green">当前行数: {{ totalLines }}</Tag>
        <Tag v-if="isStreaming" color="orange"> <span class="blinking-dot">●</span> 实时流式 </Tag>
      </div>
    </div>

    <div class="log-container">
      <YMonaco
        ref="monacoRef"
        :model-value="''"
        :log-mode="true"
        :max-lines="5000"
        :scroll-threshold="10"
        :auto-scroll="true"
        language="shell"
        :height="500"
        :readonly="true"
        :options="{
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          wordWrap: 'off',
        }"
        @scroll-end="handleScrollEnd"
        @line-exceed="handleLineExceed"
      />
    </div>

    <div class="tips">
      <Alert type="info" show-icon>
        <template #message>
          <strong>功能说明</strong>
        </template>
        <template #description>
          <ul>
            <li>✅ <strong>自动滚动</strong>：启用日志流后自动滚动到底部显示最新日志</li>
            <li>✅ <strong>滚动触底加载</strong>：手动滚动到底部时会触发加载更多日志</li>
            <li>✅ <strong>行数限制</strong>：最大保留 5000 行，超出时自动删除旧日志</li>
            <li>✅ <strong>性能优化</strong>：采用增量追加而非全量替换，Monaco 虚拟滚动性能优异</li>
            <li>💡 查看控制台可以看到 <code>scroll-end</code> 事件触发日志</li>
          </ul>
        </template>
      </Alert>
    </div>
  </div>
</template>

<style scoped lang="less">
.log-viewer-demo {
  .control-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 12px 16px;
    border-radius: 4px;

    .stats {
      display: flex;
      gap: 8px;
    }

    .blinking-dot {
      animation: blink 1.5s infinite;
    }
  }

  // .log-container {
  //   margin-bottom: 16px;
  //   border: 1px solid #d9d9d9;
  //   border-radius: 4px;
  //   overflow: hidden;
  // }

  .tips {
    ul {
      margin: 8px 0 0 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        line-height: 1.8;
      }

      code {
        padding: 2px 6px;
        background: #f0f0f0;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
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
