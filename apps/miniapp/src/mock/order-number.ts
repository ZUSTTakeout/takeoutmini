export function orderNumberPrefix(shopId: string, date: Date): string {
  const shopCode = shopId.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  const campusDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const day = [
    String(campusDate.getUTCFullYear()).slice(-2),
    String(campusDate.getUTCMonth() + 1).padStart(2, "0"),
    String(campusDate.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `${day}-${shopCode}-`;
}

export function formatOrderNumber(shopId: string, sequence: number, date: Date): string {
  return orderNumberPrefix(shopId, date) + String(sequence).padStart(4, "0");
}
