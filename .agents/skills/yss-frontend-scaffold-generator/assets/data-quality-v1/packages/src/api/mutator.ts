import axios, { type AxiosRequestConfig } from 'axios';
/** 宿主认证可注入拦截器；骨架不假定 token 存储键或登录跳转。 */
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '', timeout: 10000 });
export async function customInstance<T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>({ ...config, ...options });
  return response.data;
}
