import { formatSGD } from '../engine';
import type { TaxResult } from '../engine';

/**
 * Plain-text summary for "Copy summary". Browser-only utility (Blob, Clipboard,
 * anchor download) — deliberately outside src/engine, which must stay pure.
 */
export function buildSummaryText(result: TaxResult): string {
  const lines = result.lines.map(
    (line) => `${line.label}: ${formatSGD(line.amount)}`,
  );
  return [
    'TaxSense — YA2026 income tax summary',
    '(Educational estimate, not an official IRAS assessment — verify at myTax Portal.)',
    '',
    ...lines,
    '',
    `Marginal rate on your next dollar: ${(result.marginalRate * 100).toFixed(1)}%`,
  ].join('\n');
}

/**
 * Downloads a minimal .ics reminder. No RFC 5545 line-folding — every field
 * here is short enough that major calendar clients import it fine unfolded;
 * documented as a known simplification rather than silently assumed safe.
 */
export function downloadIcsReminder(): void {
  const dtstamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const uid = `taxsense-reminder-${Date.now()}@taxsense.local`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaxSense//YA2026//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    'DTSTART;VALUE=DATE:20261001',
    'SUMMARY:Check your TaxSense tax-saving moves',
    'DESCRIPTION:Revisit your SRS/CPF top-up headroom on TaxSense before the 31 Dec 2026 deadline.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'taxsense-reminder.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
