export function mockRequest<T>(): Promise<T> {
  return Promise.reject(new Error("请求失败"));
}
