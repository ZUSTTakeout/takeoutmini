import catalog from "./catalog.json";

export type IconName = keyof typeof catalog.icons;
export type ReIconName = IconName;
export const iconNames = Object.keys(catalog.icons) as IconName[];
export const iconColors = catalog.colors;

export type IconColor = keyof typeof iconColors;

export function getIconColor(color: string): IconColor {
  if (Object.prototype.hasOwnProperty.call(iconColors, color)) return color as IconColor;
  const normalized = color.trim().toLowerCase();
  if (normalized === "#fff") return "white";
  return (Object.entries(iconColors).find(([, value]) => value === normalized)?.[0] as IconColor) ?? "text";
}
