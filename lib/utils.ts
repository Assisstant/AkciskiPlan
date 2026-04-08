export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("mk-MK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("mk-MK", {
    dateStyle: "medium"
  }).format(date);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.а-шѓѕјљњќчџж]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
