// SVG charts for the PDF test report (tools/report-pdf.mjs). Static, light theme, printed by Chromium.
// Colours: test outcomes use the fixed status palette (always shown with a label, never colour alone);
// magnitudes (durations) use one blue. Text uses ink tokens, never a series colour.

export const COLORS = {
  passed: '#0ca30c', // status: good
  failed: '#d03b3b', // status: critical
  skipped: '#fab219', // status: warning
  flaky: '#ec835a', // status: serious
  blue: '#2a78d6', // single-hue magnitude
  ink: '#0b0b0b',
  ink2: '#52514e',
  muted: '#8a8984',
  grid: '#e6e5e1',
  surface: '#ffffff',
};

export const STATUS_LABEL = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped', flaky: 'Flaky (passed on retry)' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}%` : '—');

/** Legend: swatch + label + count (+ share), so identity never rests on colour alone. */
export function legend(items, total) {
  return `<div class="legend">${items
    .map(
      (i) =>
        `<div class="lg"><span class="sw" style="background:${i.color}"></span><span class="lgl">${esc(i.label)}</span><b>${i.value}</b>${
          total ? `<span class="lgp">${pct(i.value, total)}</span>` : ''
        }</div>`,
    )
    .join('')}</div>`;
}

/** Donut of outcomes with the headline figure in the middle. segments: [{ label, value, color }]. */
export function donut(segments, { center, caption, size = 176 } = {}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 16;
  const sw = 26;
  const c = 2 * Math.PI * r;
  const live = segments.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 2 : 0; // 2px surface gap between segments
  let offset = 0;
  const arcs = live
    .map((s) => {
      const len = (s.value / total) * c;
      const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-dasharray="${Math.max(len - gap, 0.5)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      offset += len;
      return arc;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(caption ?? '')}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${COLORS.grid}" stroke-width="${sw}"/>
    ${arcs}
    <text x="50%" y="${size / 2 + 2}" text-anchor="middle" font-size="26" font-weight="700" fill="${COLORS.ink}">${esc(center ?? '')}</text>
    <text x="50%" y="${size / 2 + 20}" text-anchor="middle" font-size="10" fill="${COLORS.ink2}">${esc(caption ?? '')}</text>
  </svg>`;
}

/**
 * Horizontal stacked bars, one row per item. rows: [{ label, segs: [{ key, value }], note }].
 * Segments are separated by a 2px gap, row ends rounded (4px); the row's numbers are written after the bar.
 */
export function stackedBars(rows, { width = 680, labelWidth = 130, noteWidth = 190, rowHeight = 26, barHeight = 14 } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.segs.reduce((a, s) => a + s.value, 0)));
  const plot = width - labelWidth - noteWidth - 10;
  const height = rows.length * rowHeight + 4;
  const body = rows
    .map((row, i) => {
      const y = i * rowHeight + (rowHeight - barHeight) / 2;
      const live = row.segs.filter((s) => s.value > 0);
      let x = labelWidth;
      const rects = live
        .map((s, j) => {
          const w = Math.max((s.value / max) * plot - (j < live.length - 1 ? 2 : 0), 1.5);
          const rect = `<rect x="${x}" y="${y}" width="${w}" height="${barHeight}" fill="${COLORS[s.key] ?? s.color}"/>`;
          x += w + (j < live.length - 1 ? 2 : 0);
          return rect;
        })
        .join('');
      const barW = x - labelWidth;
      return `<text x="${labelWidth - 8}" y="${y + barHeight - 3}" text-anchor="end" font-size="10.5" fill="${COLORS.ink}">${esc(row.label)}</text>
        <clipPath id="row${i}-${rows.length}"><rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="4"/></clipPath>
        <g clip-path="url(#row${i}-${rows.length})">${rects}</g>
        <text x="${labelWidth + plot + 10}" y="${y + barHeight - 3}" font-size="10" fill="${COLORS.ink2}">${esc(row.note ?? '')}</text>`;
    })
    .join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

/** Vertical bar chart (one series, blue), e.g. how many tests took how long. bins: [{ label, value }]. */
export function columns(bins, { width = 680, height = 170, caption = '' } = {}) {
  const max = Math.max(1, ...bins.map((b) => b.value));
  const top = 18;
  const bottom = 30;
  const plotH = height - top - bottom;
  const slot = (width - 20) / bins.length;
  const barW = Math.min(56, slot - 12);
  const bars = bins
    .map((b, i) => {
      const h = b.value ? Math.max((b.value / max) * plotH, 2) : 0;
      const x = 10 + i * slot + (slot - barW) / 2;
      const y = top + plotH - h;
      const r = Math.min(4, h / 2, barW / 2);
      // Rounded data end (top), square at the baseline.
      const path = h
        ? `<path d="M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z" fill="${COLORS.blue}"/>`
        : '';
      return `${path}
        <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="${COLORS.ink}">${b.value}</text>
        <text x="${x + barW / 2}" y="${height - 12}" text-anchor="middle" font-size="9.5" fill="${COLORS.ink2}">${esc(b.label)}</text>`;
    })
    .join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(caption)}">
    <line x1="10" x2="${width - 10}" y1="${top + plotH}" y2="${top + plotH}" stroke="${COLORS.grid}"/>${bars}</svg>`;
}

/** CSS for the chart pieces (legend, tiles, heatmap cells). */
export const CHART_CSS = `
  .hero { display: flex; gap: 8px; margin: 12px 0 6px; }
  .tile { flex: 1; border: 1px solid #e3e7ef; border-radius: 8px; padding: 8px 10px; }
  .tile .v { font-size: 22px; font-weight: 700; color: ${COLORS.ink}; line-height: 1.2; }
  .tile .k { color: ${COLORS.ink2}; font-size: 9.5px; }
  .tile .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
  .verdict { font-size: 13px; font-weight: 600; padding: 8px 12px; border-radius: 8px; margin: 10px 0 4px; }
  .verdict.good { background: #e9f6e9; color: #0b4f0b; } .verdict.bad { background: #fbeaea; color: #7a1616; }
  .row2 { display: flex; gap: 18px; align-items: center; }
  .legend { display: flex; flex-direction: column; gap: 5px; }
  .lg { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: ${COLORS.ink}; }
  .lg .sw { width: 11px; height: 11px; border-radius: 3px; } .lg .lgl { min-width: 130px; } .lg b { min-width: 34px; text-align: right; }
  .lg .lgp { color: ${COLORS.ink2}; min-width: 40px; text-align: right; }
  .legend.inline { flex-direction: row; flex-wrap: wrap; gap: 14px; margin: 4px 0 2px; } .legend.inline .lgl { min-width: 0; }
  .heat td.h { text-align: center; font-weight: 600; font-size: 9.5px; }
  .heat td.hp { background: #e7f5e7; color: #0b4f0b; } .heat td.hf { background: #fbe4e4; color: #7a1616; }
  .heat td.hk { background: #fdeee6; color: #7a3a16; } .heat td.hs { background: #fdf6e1; color: #6b5200; }
  .caption { color: ${COLORS.ink2}; font-size: 9.5px; margin: 2px 0 8px; }
`;
