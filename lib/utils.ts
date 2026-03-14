import { clsx } from "clsx";
import { addHours, format, formatDistanceToNowStrict, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatDateTime(value: string) {
  return format(parseISO(value), "dd MMM, HH:mm", { locale: es });
}

export function formatDateTimeInput(value: string) {
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

export function relativeTime(value: string) {
  return formatDistanceToNowStrict(parseISO(value), { locale: es, addSuffix: true });
}

export function isOverdue(value: string) {
  return isPast(parseISO(value));
}

export function defaultDueAtInput() {
  const next = addHours(new Date(), 4);
  next.setMinutes(0, 0, 0);
  return format(next, "yyyy-MM-dd'T'HH:mm");
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
