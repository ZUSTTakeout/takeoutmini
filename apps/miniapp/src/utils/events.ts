export function nativeDetail<T>(event: unknown): T {
  if (event && typeof event === "object" && "detail" in event) {
    return event.detail as T;
  }
  return event as T;
}

export function nativeValue(event: unknown): string {
  const detail = nativeDetail<unknown>(event);
  if (detail && typeof detail === "object" && "value" in detail) {
    return String(detail.value ?? "");
  }
  return String(detail ?? "");
}

export function nativeNumber(event: unknown): number {
  return Number(nativeValue(event));
}
