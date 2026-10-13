export const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
