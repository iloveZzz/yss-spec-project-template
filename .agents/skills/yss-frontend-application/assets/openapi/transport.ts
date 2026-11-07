import axios, { type AxiosRequestConfig } from 'axios'

// 有现成客户端时复用它；认证、租户和 baseURL 遵循真实项目契约。
export const httpClient = axios.create({ baseURL: '/', timeout: 15_000 })

export async function customRequest<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  // Axios takes url/method/data only from the second merge config.
  const response = await httpClient.request<T>(axios.mergeConfig(config, { ...config, ...options }))
  return response.data
}
