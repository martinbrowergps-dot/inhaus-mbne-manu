import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseBRDate } from "./format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Dias desde uma data (string BR ou ISO). Retorna null se inválida. */
export function daysSince(date: string): number | null {
  const d = parseBRDate(date);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
