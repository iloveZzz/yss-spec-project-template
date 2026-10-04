## 业务查询区布局

```vue
<template>
  <YCard class="demo-page__search-card" :padding="16">
    <div class="demo-page__search-content">
      <div class="demo-page__search-form">
        <YFormily v-model="queryModel" :schema="searchSchema" />
      </div>
      <div class="demo-page__search-actions">
        <YButton type="primary" @click="handleSearch">查询</YButton>
        <YButton @click="handleReset">重置</YButton>
      </div>
    </div>
  </YCard>
</template>
```

```less
.demo-page {
  &__search-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  &__search-form {
    width: 100%;
    min-width: 0;

    :deep(.ant-formily-form-item) {
      margin-bottom: 0;
    }

    :deep(.ant-formily-form-grid) {
      width: 100%;
    }
  }

  &__search-actions {
    display: flex;
    width: 100%;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }
}
```
