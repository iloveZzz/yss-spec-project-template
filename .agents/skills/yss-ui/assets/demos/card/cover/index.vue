<script setup lang="ts">
import { YCard } from '@yss-ui/components';
import { Avatar } from 'ant-design-vue';
import { SettingOutlined, EditOutlined, EllipsisOutlined } from '@ant-design/icons-vue';
</script>

<template>
  <YCard hoverable style="width: 300px">
    <template #cover>
      <img alt="example" src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png" />
    </template>
    <template #actions>
      <SettingOutlined key="setting" />
      <EditOutlined key="edit" />
      <EllipsisOutlined key="ellipsis" />
    </template>
    <template #meta-title>Card title</template>
    <template #meta-description>This is the description</template>
    <template #meta-avatar>
      <Avatar src="https://joeschmoe.io/api/v1/random" />
    </template>
  </YCard>
</template>

<style scoped lang="less"></style>
