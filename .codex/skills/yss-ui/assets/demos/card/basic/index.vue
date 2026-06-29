<script setup lang="ts">
import { YCard } from '@yss-ui/components';
import './style.less';
</script>

<template>
  <div class="basic-demo">
    <div class="cards-grid">
      <!-- 1. 基础卡片 -->
      <YCard title="基础卡片">
        <p>这是一个基础的卡片组件，使用默认的样式和配置。</p>
        <p>内容区域使用默认的内边距（16px）。</p>
      </YCard>

      <!-- 2. 自定义 padding -->
      <YCard title="自定义 Padding" :padding="32">
        <p>这个卡片使用了自定义的 padding 属性。</p>
        <p>padding 设置为 32px，内容区域有更大的内边距。</p>
      </YCard>

      <!-- 3. 标题插槽 -->
      <YCard>
        <template #title>
          <span style="color: var(--primary-color, #1890ff); font-weight: 600"> 标题插槽 </span>
        </template>
        <p>这个卡片使用了标题插槽，可以自定义标题的样式和内容。</p>
        <p>标题使用了自定义颜色和字体粗细。</p>
      </YCard>

      <!-- 4. 自定义 customStyle 样式 -->
      <YCard
        title="自定义 Style"
        :custom-style="{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          border: 'none',
        }"
      >
        <p style="color: rgb(255 255 255 / 90%)">这个卡片使用了 customStyle 属性，直接设置样式对象。</p>
        <p style="color: rgb(255 255 255 / 90%)">可以设置背景、颜色、边框等任何 CSS 样式。</p>
      </YCard>

      <!-- 5. 自定义 className 样式 -->
      <YCard title="自定义 ClassName" class-name="custom-card-style">
        <p>这个卡片使用了 className 属性，通过 CSS 类名来定制样式。</p>
        <p>适合需要复用样式或使用主题变量的场景。</p>
      </YCard>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
