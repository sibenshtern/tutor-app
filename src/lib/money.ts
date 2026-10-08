export function calcAmountDue(rateKopecks: number, durationMinutes: number): number {
  return Math.round((rateKopecks * durationMinutes) / 60);
}

export function parseRubles(input: string): number | null {
  const cleaned = input.replace(/[\s₽]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

const whole = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function formatRub(kopecks: number): string {
  return (kopecks % 100 === 0 ? whole : fractional).format(kopecks / 100);
}
