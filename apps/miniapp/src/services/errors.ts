export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 0) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export function getErrorMessage(error: unknown, fallback = "请求失败，请稍后重试") {
  return error instanceof Error && error.message ? error.message : fallback;
}
