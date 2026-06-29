<script setup lang="ts">
/**
 * YCron 在 Select 下拉面板中使用示例
 * @description 将 Cron 组件放入 Select 的下拉面板，类似日期选择器的交互方式
 */
import { ref, computed } from 'vue';
import { Popover, Button } from 'ant-design-vue';
import { ScheduleOutlined } from '@ant-design/icons-vue';
import { YCron } from '@yss-ui/components';

/** 弹出框是否可见 */
const popoverVisible = ref(false);

/** Cron 表达式 */
const cronValue = ref('0 0 12 * * ?');

/** 临时表达式（编辑中） */
const tempCronValue = ref('');

/**
 * 打开弹出框
 */
const openPopover = () => {
  tempCronValue.value = cronValue.value;
  popoverVisible.value = true;
};

/**
 * 确认选择
 */
const handleConfirm = () => {
  cronValue.value = tempCronValue.value;
  popoverVisible.value = false;
};

/**
 * 取消选择
 */
const handleCancel = () => {
  popoverVisible.value = false;
};

/**
 * 显示的表达式文本
 */
const displayValue = computed(() => cronValue.value);
</script>

<template>
  <div class="demo-cron-select">
    <Popover
      v-model:open="popoverVisible"
      trigger="click"
      placement="bottomLeft"
      :arrow="false"
      overlay-class-name="cron-select-popover"
    >
      <template #content>
        <div class="cron-popover-content">
          <YCron v-model="tempCronValue" />
          <div class="cron-popover-footer">
            <Button size="small" @click="handleCancel">取消</Button>
            <Button type="primary" size="small" @click="handleConfirm">确定</Button>
          </div>
        </div>
      </template>

      <div class="cron-select-trigger" @click="openPopover">
        <ScheduleOutlined class="cron-select-icon" />
        <span class="cron-select-value">{{ displayValue }}</span>
      </div>
    </Popover>
  </div>
</template>

<style scoped lang="less">
.demo-cron-select {
  width: 280px;
}

.cron-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 11px;
  height: 32px;
  // background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4096ff;
  }
}

.cron-select-icon {
  // color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

.cron-select-value {
  flex: 1;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  // color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cron-select-suffix {
  color: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
}

.cron-popover-content {
  width: 460px;

  .y-cron {
    border: none;
    height: 296px;
  }
}

.cron-popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 0 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
}
</style>

<style lang="less">
// 全局样式：调整 Popover 内边距
.cron-select-popover {
  .ant-popover-inner {
    padding: 12px;
  }
}
</style>
