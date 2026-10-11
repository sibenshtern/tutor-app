// Returns a `tel:` href when the text looks like a phone number, otherwise null (emails, blanks, free text).
export function phoneHref(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text || !/^\+?[\d\s\-().]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 5 || digits.length > 15) return null;
  return `tel:${text.startsWith("+") ? "+" : ""}${digits}`;
}
