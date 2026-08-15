import type { Analysis } from "./types";

function fmt(value: number | undefined): string {
  return value === undefined ? "-" : String(Number(value.toFixed(5)));
}

/** Slug built from the last analysed row's datetime, e.g. 2024-05-03 14:30 -> 2024-05-03_1430 */
export function exportFileName(analysis: Analysis): string {
  const slug = (analysis.lastRowDatetime || "analysis")
    .trim()
    .replace(/[:\s/]+/g, "-")
    .replace(/[^0-9A-Za-z_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `structure-scout_${slug || "analysis"}.txt`;
}

export function buildReport(analysis: Analysis): string {
  const lines: string[] = [];

  lines.push("=== SUMMARY ===");
  lines.push(`data_age: ${analysis.meta.data_age}`);
  lines.push(`spread_convention: ${analysis.meta.spread_convention} (applied: ${analysis.spread})`);
  lines.push(`atr_method: ${analysis.meta.atr_method}`);
  lines.push(`similar_swing_selection_rule: ${analysis.meta.similar_swing_selection_rule}`);
  lines.push("");
  lines.push(`Total candles: ${analysis.totalRows}`);
  lines.push(`Analyzed candles: ${analysis.analyzedRows}`);
  lines.push(`INVALID rows: ${analysis.invalidRows}`);
  lines.push(`Total PASS setups: ${analysis.passing.length}`);
  lines.push("");

  lines.push("-- Per strategy --");
  for (const strategy of analysis.perStrategy) {
    lines.push(`${strategy.strategy}: PASS ${strategy.passCount} | FAIL ${strategy.failCount}`);
    for (const reason of strategy.failReasons) {
      lines.push(`    ${reason.count} x ${reason.reason}`);
    }
  }
  lines.push("");

  lines.push("-- Overlaps (same candle, multiple PASS) --");
  if (analysis.overlaps.length === 0) lines.push("none");
  for (const overlap of analysis.overlaps) {
    lines.push(`${overlap.datetime}: ${overlap.strategies.join(", ")}`);
  }
  lines.push("");

  lines.push("-- Ranked PASS setups (RR desc) --");
  if (analysis.passing.length === 0) lines.push("none");
  analysis.passing.forEach((row, i) => {
    lines.push(
      `${i + 1}. ${row.strategy} @ ${row.datetime} | ${row.side ?? "-"} | entry ${fmt(row.entry)} | SL ${fmt(row.sl)} | TP ${fmt(row.tp)} | RR ${row.rr === undefined ? "-" : row.rr.toFixed(2)}`,
    );
  });
  lines.push("");

  lines.push("=== RESULTS ===");
  lines.push("datetime | strategy | result | trend | entry | SL | TP | RR | reason");
  for (const row of analysis.results) {
    lines.push(
      [
        row.datetime,
        row.strategy,
        row.result,
        row.trend,
        fmt(row.entry),
        fmt(row.sl),
        fmt(row.tp),
        row.rr === undefined ? "-" : row.rr.toFixed(2),
        row.reason,
      ].join(" | "),
    );
  }

  for (const invalid of analysis.invalidRowList) {
    lines.push(`${invalid.datetime} | (all strategies) | SKIPPED | - | - | - | - | - | ${invalid.reason}`);
  }

  return lines.join("\n");
}

export function downloadReport(analysis: Analysis): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([buildReport(analysis)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(analysis);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
