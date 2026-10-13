export function getPickupCode(number: string): string {
  return /^\d{6}-[A-Z0-9]{4}-(\d{4})$/.exec(number)?.[1] || "";
}
