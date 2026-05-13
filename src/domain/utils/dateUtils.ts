/**
 * Calcula la fecha de vencimiento sumando años y meses a una fecha base.
 * Si no se pasa base se usa la fecha actual.
 */
export const calculateExpiration = (
  base: Date | string | null,
  years: number,
  months: number,
): string | null => {
  const y = Number(years) || 0;
  const m = Number(months) || 0;
  if (y === 0 && m === 0) {
    return null;
  }

  const start = base ? new Date(base) : new Date();
  if (isNaN(start.getTime())) return null;
  start.setFullYear(start.getFullYear() + y);
  start.setMonth(start.getMonth() + m);
  return start.toISOString().split("T")[0] ?? null;
};

/** Tabla de meses abreviados en español → número de mes */
const MESES: Record<string, string> = {
  ENE: "01",
  FEB: "02",
  MAR: "03",
  ABR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DIC: "12",
};

/**
 * Convierte una fecha extraída de PDF (DD/MMM/AA → YYYY-MM-DD).
 * Ejemplo: "15/ENE/24" → "2024-01-15"
 */
export const formatPDFDate = (fechaPDF: string): string => {
  const [dia, mesTexto = "", anioCorto] = fechaPDF.split("/");
  const numeroMes = MESES[mesTexto.toUpperCase()] ?? "01";
  return `20${anioCorto}-${numeroMes}-${dia}`;
};
