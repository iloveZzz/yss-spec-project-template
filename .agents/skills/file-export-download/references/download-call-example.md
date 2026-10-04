## 标准代码骨架

### 生成方法已包含 responseType

```typescript
import { ref } from 'vue';
import { handleBlobResponse } from '@yss-ui/utils';
import { downloadAccessSecret } from '@/api/generated/quality';

/** 微应用 mutator 返回的文件下载响应。 */
type BlobDownloadResponse = {
  data: Blob;
  headers: Record<string, string>;
};

/** 文件下载进行中状态。 */
const downloading = ref(false);

/** 下载密钥文件。 */
const downloadFile = async (key: string): Promise<void> => {
  if (downloading.value) return;

  downloading.value = true;
  try {
    const res = (await downloadAccessSecret(key)) as unknown as BlobDownloadResponse;
    handleBlobResponse(res.data, res.headers);
  } catch {
    // mutator 已展示错误；此处只阻止 reject 继续向 UI 事件传播。
  } finally {
    downloading.value = false;
  }
};
```

### 生成方法缺少 responseType

只改调用行，其他流程保持一致：

```typescript
const res = (await downloadAccessSecret(key, {
  responseType: 'blob',
})) as unknown as BlobDownloadResponse;
```

若 mutator 与 Orval 返回类型已经准确声明为 `{ data: Blob; headers: ... }`，直接使用生成类型，删除不必要的类型断言。
