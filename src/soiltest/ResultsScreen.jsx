// src/screens/test/SoilResultsScreen.js
// src/screens/test/SoilResultsScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
View,
Text,
StyleSheet,
StatusBar,
ScrollView,
Animated,
TouchableOpacity,
ActivityIndicator,
Dimensions,
Platform,
Share,
Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
Circle,
Line,
Polygon,
Text as SvgText,
Defs,
LinearGradient,
Stop,
} from 'react-native-svg';
import { useSelector, useDispatch } from 'react-redux';

// ── your existing imports (unchanged paths) ──────────────────────────────────
import { TopBar, AppButton } from '../components/common';
import useTheme from '../hooks/useTheme';
import { Spacing, Typography } from '../theme';
import { nutrients } from '../utils/constants';
import {
createSoilReading,
getSoilRecommendations,
getSoilAIRecommendations,
buildSoilPayload,
} from '../redux/actions/soilsaathiActions';
// NEW: print command
import { cmdPrintSoilResult } from '../redux/actions/bleActions';

const { width: SW } = Dimensions.get('window');
const PAD = Spacing.lg ?? 16;
const CARD_W = (SW - PAD * 2 - 20) / 3;

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LOGIC  (same as your original getStatus, theme-token-aware)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
red: '#EF4444',
green: '#22C55E',
yellow: '#F59E0B',
purple: '#A78BFA',
blue: '#60A5FA',
};

function getStatus(key, value, mutedColor) {
if (value == null) return { label: 'N/A', color: mutedColor };
if (key === 'ph') {
  if (value < 6) return { label: 'Acidic', color: STATUS_COLORS.red };
  if (value <= 7.5) return { label: 'Optimal', color: STATUS_COLORS.green };
  return { label: 'Alkaline', color: STATUS_COLORS.yellow };
}
if (key === 'ec') {
  if (value < 0.5) return { label: 'Low', color: STATUS_COLORS.red };
  if (value <= 1.5) return { label: 'Normal', color: STATUS_COLORS.green };
  return { label: 'High', color: STATUS_COLORS.yellow };
}
if (value < 20) return { label: 'Low', color: STATUS_COLORS.red };
if (value < 50) return { label: 'Normal', color: STATUS_COLORS.green };
return { label: 'High', color: STATUS_COLORS.yellow };
}

function formatValue(val) {
if (val == null) return '--';
const num = Number(val);
return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function maxFor(key) {
if (key === 'ph') return 14;
if (key === 'ec') return 3;
if (key === 'OC') return 5;  // ✅ Changed from 'oc' to 'OC'
return 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF REPORT GENERATOR
// Uses react-native-html-to-pdf if available, falls back to Share plaintext
// Install: npm install react-native-html-to-pdf
// ─────────────────────────────────────────────────────────────────────────────
async function generatePDFReport({
mapped,
recs,
aiText,
callId,
healthPct,
T,
}) {
// Build HTML string
const date = new Date().toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const nutrientRows = mapped
  .map(n => {
    const st = getStatus(n.key, n.value, '#9CA3AF');
    return `
      <tr>
        <td>${n.label ?? n.key}</td>
        <td style="text-align:center;font-weight:700;">${formatValue(
          n.value,
        )}${n.unit ? ' ' + n.unit : ''}</td>
        <td style="text-align:center;color:${st.color};font-weight:700;">${
      st.label
    }</td>
      </tr>`;
  })
  .join('');

const fertRows = (recs?.recommendations?.crop_fertilizer ?? [])
  .map(group => {
    const year = group[0];
    const items = group
      .slice(1)
      .map(l => `<li>${l}</li>`)
      .join('');
    return `<div class="year-block"><h4>${year}</h4><ul>${items}</ul></div>`;
  })
  .join('');

const fymLines = (recs?.recommendations?.fym ?? [])
  .flat()
  .map(l => `<li>${l}</li>`)
  .join('');

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, Arial, sans-serif; background:#fff; color:#111; padding:32px; font-size:13px; }
h1 { font-size:22px; font-weight:900; color:#15803D; margin-bottom:4px; }
.subtitle { color:#6B7280; font-size:12px; margin-bottom:24px; }
.meta { display:flex; gap:24px; margin-bottom:24px; padding:12px 16px; background:#F0FDF4; border-radius:8px; border:1px solid #BBF7D0; }
.meta-item label { font-size:10px; color:#6B7280; font-weight:700; text-transform:uppercase; }
.meta-item span { font-size:14px; font-weight:800; color:#111; }
h2 { font-size:15px; font-weight:800; color:#111; margin:20px 0 10px; padding-bottom:4px; border-bottom:2px solid #E5E7EB; }
h3 { font-size:13px; font-weight:700; color:#374151; margin:14px 0 6px; }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th { background:#F9FAFB; text-align:left; padding:8px 10px; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; border-bottom:1px solid #E5E7EB; }
td { padding:8px 10px; border-bottom:1px solid #F3F4F6; font-size:12px; }
tr:last-child td { border-bottom:none; }
.year-block { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px 16px; margin-bottom:10px; }
.year-block h4 { color:#15803D; font-size:12px; font-weight:800; margin-bottom:6px; }
.year-block ul { padding-left:16px; }
.year-block li { font-size:12px; color:#374151; margin-bottom:3px; }
.fym-block { background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:12px 16px; margin-bottom:16px; }
.fym-block ul { padding-left:16px; }
.fym-block li { font-size:12px; color:#92400E; margin-bottom:3px; }
.ai-block { background:#F5F3FF; border:1px solid #DDD6FE; border-radius:8px; padding:14px 16px; margin-bottom:16px; }
.ai-block p { font-size:12px; color:#4C1D95; line-height:1.7; }
.health-score { display:inline-block; background:#F0FDF4; border:2px solid #22C55E; border-radius:50%; width:64px; height:64px; line-height:64px; text-align:center; font-size:18px; font-weight:900; color:#15803D; float:right; margin-top:-8px; }
.footer { margin-top:32px; padding-top:12px; border-top:1px solid #E5E7EB; color:#9CA3AF; font-size:10px; text-align:center; }
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <h1>🌱 Soil Analysis Report</h1>
    <p class="subtitle">SoilSaathi · Generated on ${date}</p>
  </div>
  <div class="health-score">${healthPct}%</div>
</div>

<div class="meta">
  <div class="meta-item">
    <label>Reading ID</label><br/>
    <span>#${callId ?? '—'}</span>
  </div>
  <div class="meta-item">
    <label>Crop</label><br/>
    <span>${recs?.crop_type ?? 'arabica_coffee'}</span>
  </div>
  <div class="meta-item">
    <label>Health Score</label><br/>
    <span style="color:#15803D">${healthPct}%</span>
  </div>
</div>

<h2>Soil Nutrient Levels</h2>
<table>
  <thead>
    <tr>
      <th>Nutrient</th>
      <th style="text-align:center">Value</th>
      <th style="text-align:center">Status</th>
    </tr>
  </thead>
  <tbody>${nutrientRows}</tbody>
</table>

${
  recs?.npk
    ? `
<h2>NPK Summary</h2>
<table>
  <thead><tr><th>Parameter</th><th style="text-align:center">Value</th><th style="text-align:center">Status</th></tr></thead>
  <tbody>
    ${Object.entries(recs.npk)
      .map(([k, v]) => {
        const st = getStatus(k, v, '#9CA3AF');
        return `<tr><td>${k.toUpperCase()}</td><td style="text-align:center;font-weight:700;">${formatValue(
          v,
        )}</td><td style="text-align:center;color:${
          st.color
        };font-weight:700;">${st.label}</td></tr>`;
      })
      .join('')}
  </tbody>
</table>`
    : ''
}

${
  fymLines
    ? `
<h2>Organic / FYM Recommendation</h2>
<div class="fym-block"><ul>${fymLines}</ul></div>`
    : ''
}

${
  fertRows
    ? `
<h2>Year-wise Fertilizer Schedule</h2>
${fertRows}`
    : ''
}

${
  aiText
    ? `
<h2>AI-Powered Insights</h2>
<div class="ai-block"><p>${aiText.replace(/\n/g, '<br/>')}</p></div>`
    : ''
}

<div class="footer">Generated by SoilSaathi App · ${date}</div>
</body>
</html>`;

try {
  // Try react-native-html-to-pdf first
  const RNHTMLtoPDF = require('react-native-html-to-pdf').default;
  const options = {
    html,
    fileName: `SoilReport_${callId ?? Date.now()}`,
    directory: Platform.OS === 'android' ? 'Downloads' : 'Documents',
    base64: false,
  };
  const file = await RNHTMLtoPDF.convert(options);
  await Share.share({
    title: 'Soil Analysis Report',
    url:
      Platform.OS === 'android' ? `file://${file.filePath}` : file.filePath,
    message:
      Platform.OS === 'android'
        ? `Soil report saved to ${file.filePath}`
        : undefined,
  });
} catch (pdfErr) {
  // Fallback: share as plain text summary
  const plainText = [
    '🌱 SOIL ANALYSIS REPORT',
    `Date: ${date}`,
    `Reading: #${callId ?? '—'}  Health: ${healthPct}%`,
    '',
    '── NUTRIENTS ──',
    ...mapped.map(n => {
      const st = getStatus(n.key, n.value, 'N/A');
      return `${(n.label ?? n.key).padEnd(14)} ${formatValue(
        n.value,
      ).padStart(6)}${n.unit ? ' ' + n.unit : ''}  [${st.label}]`;
    }),
    '',
    ...(recs?.recommendations?.fym?.flat() ?? []).map(l => `🌿 ${l}`),
    '',
    ...(recs?.recommendations?.crop_fertilizer ?? []).flatMap(g => [
      g[0],
      ...g.slice(1).map(l => `  ${l}`),
    ]),
    '',
    aiText ? `🤖 AI INSIGHTS\n${aiText}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await Share.share({ title: 'Soil Analysis Report', message: plainText });
}
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
function AnimBar({ value, max, color, trackColor }) {
const anim = useRef(new Animated.Value(0)).current;
const pct = value != null ? Math.min(Math.max(Number(value) / max, 0), 1) : 0;

useEffect(() => {
  Animated.spring(anim, {
    toValue: pct,
    tension: 35,
    friction: 7,
    useNativeDriver: false,
  }).start();
}, [pct]);

const w = anim.interpolate({
  inputRange: [0, 1],
  outputRange: ['0%', '100%'],
});

return (
  <View style={[ab.track, { backgroundColor: trackColor }]}>
    <Animated.View style={[ab.fill, { width: w, backgroundColor: color }]} />
  </View>
);
}
const ab = StyleSheet.create({
track: { height: 4, borderRadius: 4, overflow: 'hidden', flex: 1 },
fill: { height: '100%', borderRadius: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH RING  — SVG circular progress
// ─────────────────────────────────────────────────────────────────────────────
function HealthRing({ pct, color, borderColor, size = 90 }) {
const r = (size - 14) / 2;
const circ = 2 * Math.PI * r;
const dash = circ * (1 - Math.min(pct, 100) / 100);
return (
  <Svg width={size} height={size}>
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      stroke={borderColor}
      strokeWidth={11}
      fill="none"
    />
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      stroke={color}
      strokeWidth={11}
      fill="none"
      strokeDasharray={`${circ}`}
      strokeDashoffset={dash}
      strokeLinecap="round"
      rotation="-90"
      origin={`${size / 2},${size / 2}`}
    />
  </Svg>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// RADAR CHART  — N P K Ca Mg S
// ─────────────────────────────────────────────────────────────────────────────
const RADAR_KEYS = [
'nitrogen',
'phosphorous',
'potassium',
'calcium',
'magnesium',
'sulphur',
];
const RADAR_LABELS = ['N', 'P', 'K', 'Ca', 'Mg', 'S'];

function RadarChart({ mapped, T }) {
const sz = SW - PAD * 2 - 32;
const cx = sz / 2,
  cy = sz / 2,
  R = sz * 0.34;
const n = RADAR_KEYS.length;
const ang = i => (Math.PI * 2 * i) / n - Math.PI / 2;
const norm = v => (v == null ? 0 : Math.min(Math.max(Number(v) / 100, 0), 1));

const dataMap = {};
mapped.forEach(m => {
  dataMap[m.key] = m.value;
});

const gridPts = lv =>
  RADAR_KEYS.map((_, i) => {
    const a = ang(i),
      ratio = (lv / 4) * R;
    return `${cx + ratio * Math.cos(a)},${cy + ratio * Math.sin(a)}`;
  }).join(' ');

const dataPts = RADAR_KEYS.map((k, i) => {
  const a = ang(i),
    ratio = norm(dataMap[k]) * R;
  return `${cx + ratio * Math.cos(a)},${cy + ratio * Math.sin(a)}`;
}).join(' ');

return (
  <Svg width={sz} height={sz}>
    <Defs>
      <LinearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={STATUS_COLORS.green} stopOpacity="0.5" />
        <Stop offset="1" stopColor={STATUS_COLORS.green} stopOpacity="0.05" />
      </LinearGradient>
    </Defs>

    {/* Grid rings */}
    {[1, 2, 3, 4].map(lv => (
      <Polygon
        key={lv}
        points={gridPts(lv)}
        fill="none"
        stroke={T.border}
        strokeWidth={1}
        opacity={0.5}
      />
    ))}

    {/* Axis lines */}
    {RADAR_KEYS.map((_, i) => (
      <Line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + R * Math.cos(ang(i))}
        y2={cy + R * Math.sin(ang(i))}
        stroke={T.border}
        strokeWidth={1}
        opacity={0.5}
      />
    ))}

    {/* Data polygon */}
    <Polygon
      points={dataPts}
      fill="url(#radarGrad)"
      stroke={STATUS_COLORS.green}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />

    {/* Data dots */}
    {RADAR_KEYS.map((k, i) => {
      const ratio = norm(dataMap[k]) * R,
        a = ang(i);
      return (
        <Circle
          key={i}
          cx={cx + ratio * Math.cos(a)}
          cy={cy + ratio * Math.sin(a)}
          r={5}
          fill={STATUS_COLORS.green}
          stroke={T.bg}
          strokeWidth={2}
        />
      );
    })}

    {/* Labels */}
    {RADAR_LABELS.map((lbl, i) => {
      const lr = R + 22,
        a = ang(i);
      return (
        <SvgText
          key={i}
          x={cx + lr * Math.cos(a)}
          y={cy + lr * Math.sin(a) + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight="700"
          fill={T.textSub}
        >
          {lbl}
        </SvgText>
      );
    })}
  </Svg>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO BAR CHART  — Zn Mn Fe Cu B
// ─────────────────────────────────────────────────────────────────────────────
const MICRO_KEYS = ['zinc', 'manganese', 'iron', 'copper', 'boron'];
const MICRO_SHORT = {
zinc: 'Zn',
manganese: 'Mn',
iron: 'Fe',
copper: 'Cu',
boron: 'B',
};

function MicroBarChart({ mapped, T }) {
const micros = mapped.filter(m => MICRO_KEYS.includes(m.key));
const maxVal = Math.max(
  ...micros.map(m => (m.value != null ? Number(m.value) : 0)),
  1,
);

return (
  <View style={{ gap: 14 }}>
    {micros.map(m => {
      const st = getStatus(m.key, m.value, T.muted);
      const pct = m.value != null ? Math.min(Number(m.value) / maxVal, 1) : 0;
      return (
        <View
          key={m.key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={[mbc.key, { color: T.textSub }]}>
            {MICRO_SHORT[m.key]}
          </Text>
          <View
            style={[mbc.track, { backgroundColor: T.border ?? '#1C2733' }]}
          >
            <View
              style={[
                mbc.fill,
                { width: `${pct * 100}%`, backgroundColor: st.color },
              ]}
            />
          </View>
          <Text style={[mbc.val, { color: st.color }]}>
            {formatValue(m.value)}
          </Text>
          <View style={[mbc.badge, { backgroundColor: st.color + '22' }]}>
            <Text style={[mbc.badgeTxt, { color: st.color }]}>
              {st.label}
            </Text>
          </View>
        </View>
      );
    })}
  </View>
);
}
const mbc = StyleSheet.create({
key: { fontSize: 11, fontWeight: '800', width: 28, textAlign: 'right' },
track: { flex: 1, height: 10, borderRadius: 6, overflow: 'hidden' },
fill: { height: '100%', borderRadius: 6 },
val: { fontSize: 11, fontWeight: '800', width: 30, textAlign: 'right' },
badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
badgeTxt: { fontSize: 9, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// NUTRIENT CARD  — same layout as original, adds bar + slide-in animation
// ─────────────────────────────────────────────────────────────────────────────
function NutrientCard({ item, idx, T }) {
const st = getStatus(item.key, item.value, T.muted);
const anim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(anim, {
    toValue: 1,
    duration: 320,
    delay: idx * 50,
    useNativeDriver: true,
  }).start();
}, []);

return (
  <Animated.View
    style={[
      nc.card,
      {
        backgroundColor: T.card,
        borderColor: st.color,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      },
    ]}
  >
    {/* colour accent top strip */}
    <View style={[nc.strip, { backgroundColor: st.color }]} />

    <Text style={[nc.label, { color: T.textSub }]} numberOfLines={1}>
      {item.label ?? item.key}
    </Text>

    <Text style={[nc.value, { color: T.text }]}>
      {formatValue(item.value)}
    </Text>

    {item.unit ? (
      <Text style={[nc.unit, { color: T.muted }]}>{item.unit}</Text>
    ) : null}

    {/* progress bar — same as original card but animated */}
    <AnimBar
      value={item.value}
      max={maxFor(item.key)}
      color={st.color}
      trackColor={T.border ?? '#1C2733'}
    />

    <View
      style={[
        nc.badge,
        { backgroundColor: st.color + '22', borderColor: st.color },
      ]}
    >
      <Text style={[nc.badgeText, { color: st.color }]}>{st.label}</Text>
    </View>
  </Animated.View>
);
}
const nc = StyleSheet.create({
card: {
  width: CARD_W,
  borderRadius: 16,
  borderWidth: 1.5,
  paddingVertical: 8,
  paddingHorizontal: 6,
  marginBottom: 10,
  alignItems: 'center',
  gap: 5,
  overflow: 'hidden',
},
strip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
label: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
value: { fontSize: 20, fontWeight: '900' },
unit: { fontSize: 11, marginTop: 2 },
badge: {
  marginTop: 6,
  borderRadius: 6,
  borderWidth: 1,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
badgeText: { fontSize: 10, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// FERTILIZER TABLE
// ─────────────────────────────────────────────────────────────────────────────
function FertilizerTable({ data, T }) {
if (!data || data.length === 0) return null;
return (
  <View style={{ gap: 8 }}>
    {data.map((group, ri) => {
      const yearLabel = group[0] ?? `Year ${ri + 1}`;
      const lines = group.slice(1);
      return (
        <View
          key={ri}
          style={[
            ftbl.block,
            { backgroundColor: T.card, borderColor: T.border ?? '#1C2733' },
          ]}
        >
          <View
            style={[
              ftbl.header,
              {
                backgroundColor: STATUS_COLORS.green + '18',
                borderBottomColor: STATUS_COLORS.green + '44',
              },
            ]}
          >
            <Text style={[ftbl.yearTxt, { color: STATUS_COLORS.green }]}>
              {yearLabel}
            </Text>
          </View>
          <View style={ftbl.body}>
            {lines.map((line, li) => {
              const ci = line.indexOf(':');
              const name = ci > -1 ? line.slice(0, ci).trim() : line;
              const rest = ci > -1 ? line.slice(ci + 1).trim() : '';
              const parts = rest.split(/\s{2,}|\t/);
              return (
                <View
                  key={li}
                  style={[
                    ftbl.row,
                    { borderBottomColor: T.border ?? '#1C2733' },
                  ]}
                >
                  <Text style={[ftbl.fertName, { color: T.textSub }]}>
                    {name}
                  </Text>
                  <View style={ftbl.amounts}>
                    {parts[0] ? (
                      <Text style={[ftbl.amount, { color: T.text }]}>
                        {parts[0].trim()}
                      </Text>
                    ) : null}
                    {parts[1] ? (
                      <Text style={[ftbl.amountSub, { color: T.muted }]}>
                        {parts[1].trim()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      );
    })}
  </View>
);
}
const ftbl = StyleSheet.create({
block: {
  borderRadius: 12,
  borderWidth: 1,
  overflow: 'hidden',
  marginBottom: 4,
},
header: { paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1 },
yearTxt: { fontSize: 12, fontWeight: '800' },
body: { padding: 12, gap: 6 },
row: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  paddingVertical: 4,
  borderBottomWidth: 1,
},
fertName: { fontSize: 12, fontWeight: '700', flex: 1 },
amounts: { alignItems: 'flex-end' },
amount: { fontSize: 12, fontWeight: '600' },
amountSub: { fontSize: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// FYM BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function FYMBlock({ data, T }) {
if (!data || data.length === 0) return null;
const lines = data.flat();
return (
  <View style={[fym.wrap, { borderColor: STATUS_COLORS.green + '44' }]}>
    <Text style={[fym.title, { color: STATUS_COLORS.green }]}>
      🌿 Organic / FYM
    </Text>
    {lines.map((l, i) => (
      <Text key={i} style={[fym.line, { color: T.textSub }]}>
        {l}
      </Text>
    ))}
  </View>
);
}
const fym = StyleSheet.create({
wrap: {
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  marginBottom: 10,
  backgroundColor: STATUS_COLORS.green + '0A',
},
title: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
line: { fontSize: 12, lineHeight: 20 },
});

// ─────────────────────────────────────────────────────────────────────────────
// NPK PILLS
// ─────────────────────────────────────────────────────────────────────────────
function NPKPills({ npk, T }) {
if (!npk) return null;
return (
  <View style={npks.row}>
    {Object.entries(npk).map(([k, v]) => {
      const st = getStatus(k, v, T.muted);
      return (
        <View
          key={k}
          style={[
            npks.pill,
            { backgroundColor: T.card, borderColor: st.color + '55' },
          ]}
        >
          <Text style={[npks.key, { color: st.color }]}>
            {k.toUpperCase()}
          </Text>
          <Text style={[npks.val, { color: T.text }]}>{formatValue(v)}</Text>
          <Text style={[npks.badge, { color: st.color }]}>{st.label}</Text>
        </View>
      );
    })}
  </View>
);
}
const npks = StyleSheet.create({
row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
pill: {
  alignItems: 'center',
  borderRadius: 10,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
  minWidth: 64,
},
key: {
  fontSize: 10,
  fontWeight: '800',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
},
val: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
badge: { fontSize: 9, fontWeight: '700', marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TAB PILL  — uses T.primary for active
// ─────────────────────────────────────────────────────────────────────────────
function TabPill({ label, active, onPress, T }) {
return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[
      tp.pill,
      { backgroundColor: T.card, borderColor: T.border ?? '#1C2733' },
      active && { backgroundColor: T.primary, borderColor: T.primary },
    ]}
  >
    <Text
      style={[tp.label, { color: T.textSub }, active && { color: '#fff' }]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
}
const tp = StyleSheet.create({
pill: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
},
label: { fontSize: 12, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHead({ title, sub, T }) {
return (
  <View style={{ marginBottom: 12, marginTop: 8 }}>
    <Text
      style={[
        Typography.h3 ?? {},
        { color: T.text, fontSize: 15, fontWeight: '800' },
      ]}
    >
      {title}
    </Text>
    {sub ? (
      <Text style={{ color: T.textSub, fontSize: 11, marginTop: 2 }}>
        {sub}
      </Text>
    ) : null}
  </View>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE BANNER
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_META = {
saving: { text: 'Saving reading…', color: STATUS_COLORS.blue, spin: true },
fetching: {
  text: 'Fetching recommendations…',
  color: STATUS_COLORS.yellow,
  spin: true,
},
done: {
  text: '✅  Analysis complete',
  color: STATUS_COLORS.green,
  spin: false,
},
error: {
  text: '⚠️  Could not save — tap to retry',
  color: STATUS_COLORS.red,
  spin: false,
},
};

function PhaseBanner({ phase, onRetry }) {
const p = PHASE_META[phase];
if (!p) return null;
return (
  <TouchableOpacity
    onPress={phase === 'error' ? onRetry : undefined}
    activeOpacity={phase === 'error' ? 0.7 : 1}
    style={[
      pb.wrap,
      { backgroundColor: p.color + '12', borderBottomColor: p.color + '44' },
    ]}
  >
    {p.spin ? (
      <ActivityIndicator
        size="small"
        color={p.color}
        style={{ marginRight: 8 }}
      />
    ) : null}
    <Text style={[pb.txt, { color: p.color }]}>{p.text}</Text>
  </TouchableOpacity>
);
}
const pb = StyleSheet.create({
wrap: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: PAD,
  paddingVertical: 10,
  borderBottomWidth: 1,
},
txt: { fontSize: 12, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function DownloadButton({ onPress, loading, T }) {
return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      dl.btn,
      { backgroundColor: T.primary, opacity: loading ? 0.6 : 1 },
    ]}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator
        size="small"
        color="#fff"
        style={{ marginRight: 8 }}
      />
    ) : (
      <Text style={dl.icon}>⬇</Text>
    )}
    <Text style={dl.label}>
      {loading ? 'Generating…' : 'Download Report'}
    </Text>
  </TouchableOpacity>
);
}
const dl = StyleSheet.create({
btn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  paddingVertical: 14,
  gap: 8,
  marginTop: 8,
  marginBottom: 4,
},
icon: { color: '#fff', fontSize: 16 },
label: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRINT BUTTON
// Sends the reading to the SoilLenz device's thermal printer over BLE.
// `disabled` covers both "no device connected" and "print already running".
// ─────────────────────────────────────────────────────────────────────────────
function PrintButton({ onPress, loading, disabled, T }) {
const isDisabled = disabled || loading;
return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      pr.btn,
      {
        borderColor: T.primary,
        backgroundColor: T.primaryGlow ?? 'transparent',
        opacity: isDisabled ? 0.5 : 1,
      },
    ]}
    disabled={isDisabled}
  >
    {loading ? (
      <ActivityIndicator
        size="small"
        color={T.primary}
        style={{ marginRight: 8 }}
      />
    ) : (
      <Text style={[pr.icon, { color: T.primary }]}>🖨</Text>
    )}
    <Text style={[pr.label, { color: T.primary }]}>
      {loading ? 'Printing…' : 'Print Report'}
    </Text>
  </TouchableOpacity>
);
}
const pr = StyleSheet.create({
btn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  borderWidth: 1.5,
  paddingVertical: 14,
  gap: 8,
  marginTop: 8,
  marginBottom: 4,
},
icon: { fontSize: 16 },
label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});

// How long to wait for a SOILPRINT response before giving up and resetting
// the button. Covers a Pi that never received the trigger at all (e.g. out
// of range) so the spinner can never hang forever again.
const PRINT_TIMEOUT_MS = 20_000;

export function SoilResultsScreen({ navigation, route }) {
const theme = useTheme();
const T = theme.colors;
const dispatch = useDispatch();
const devices = useSelector(s => s.userDevices?.devices || []);
const soilLenzDevice = devices.find(d => d.devise_type === 'soilsaathi');
const soilData = useSelector(s => s.soilsaathi?.bleResultData);
const deviceId = soilLenzDevice?.id;

// BLE connection + print status (printStatus comes from the
// BLE_PRINT_STATUS action dispatched in bleActions.js — 'printing' |
// 'done' | 'error'). Requires that action to be wired into the `ble`
// reducer the same way `mixingCompleted` already is.
const { connected } = useSelector(s => s.ble);
const printStatus = useSelector(s => s.ble?.printStatus);

console.log('[SoilResults] deviceId:', deviceId);
console.log('[SoilResults] soilData:', soilData);

const [phase, setPhase] = useState('idle');
const [callId, setCallId] = useState(null);
const [recs, setRecs] = useState(null);
const [aiRecs, setAiRecs] = useState(null);
const [recsLoading, setRecsLoading] = useState(false);
const [aiRecsLoading, setAiRecsLoading] = useState(false);
const [tab, setTab] = useState('nutrients');
const [pdfLoading, setPdfLoading] = useState(false);
const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
// local "request sent, waiting for STARTED/DONE/ERROR" flag — covers the
// brief gap before printStatus flips, and doubles as the timeout trigger.
const [printRequesting, setPrintRequesting] = useState(false);

const headerAnim = useRef(new Animated.Value(0)).current;

// ── map BLE data → display list ─────────────────────────────────────────
const mapped = nutrients.map(n => ({
  ...n,
  value: soilData?.[n.key] ?? null,
}));

// Log mapped data to see what's being mapped
console.log('[SoilResults] Mapped nutrients:', mapped.map(m => ({ key: m.key, value: m.value })));

// ── health score ─────────────────────────────────────────────────────────
const scored = mapped.filter(m => m.value != null);
const optimal = scored.filter(m => {
  const { label } = getStatus(m.key, m.value, T.muted);
  return label === 'Optimal' || label === 'Normal';
}).length;
const healthPct =
  scored.length > 0 ? Math.round((optimal / scored.length) * 100) : 0;
const healthColor =
  healthPct >= 70
    ? STATUS_COLORS.green
    : healthPct >= 40
    ? STATUS_COLORS.yellow
    : STATUS_COLORS.red;

// ── ai text ──────────────────────────────────────────────────────────────
const aiText =
  typeof aiRecs === 'string'
    ? aiRecs
    : aiRecs?.recommendation ??
      aiRecs?.ai_recommendation ??
      aiRecs?.text ??
      aiRecs?.message ??
      null;

// ── Step 1: Save reading ───────────────────────────────────────────────
// FIX: This is the source of the infinite retry loop. Previously the
// catch block did `setHasAttemptedSave(false)` on failure, which
// re-satisfied the effect's `!hasAttemptedSave` guard below and fired
// saveReading() again on the very next render — forever, as fast as the
// request/response cycle allowed, since a genuine validation (400) error
// fails identically every time and is not transient.
//
// hasAttemptedSave now ONLY gets set back to false by the user tapping
// the retry banner (see retrySave below), never automatically by the
// failure path itself.
const saveReading = useCallback(async () => {
  if (!soilData || !deviceId) {
    console.log('[SoilResults] Cannot save: missing soilData or deviceId');
    return;
  }

  if (hasAttemptedSave) {
    console.log('[SoilResults] Save already attempted');
    return;
  }

  try {
    setHasAttemptedSave(true);
    setPhase('saving');

    console.log('[SoilResults] Saving reading with data:', soilData);

    const payload = buildSoilPayload(soilData, {
      areaName: route?.params?.areaName ?? 'Test Area',
      cropType: route?.params?.cropType ?? 'arabica_coffee',
      latitude: route?.params?.latitude ?? 0,
      longitude: route?.params?.longitude ?? 0,
    });

    const result = await dispatch(createSoilReading(deviceId, payload));
    const created = result?.payload?.data ?? result?.data;
    const id = created?.id ?? created?.call_id;

    if (!id) throw new Error('No id returned from create');

    console.log('[SoilResults] Reading saved with ID:', id);
    setCallId(id);
    setPhase('fetching');
    fetchBothRecs(id);
  } catch (e) {
    console.warn('[SoilResults] saveReading error:', e);
    setPhase('error');
    // Do NOT reset hasAttemptedSave here — that was the bug. Leaving it
    // `true` stops the effect below from immediately re-firing this
    // function in a tight loop. The user (or retrySave) decides when to
    // try again.
  }
}, [soilData, deviceId, hasAttemptedSave]);

// explicit, user-triggered retry. Only this resets hasAttemptedSave,
// which lets the effect below fire saveReading() exactly once more.
const retrySave = useCallback(() => {
  setHasAttemptedSave(false);
}, []);

// ── Step 2: Fetch recommendations ──────────────────────────────────────
const fetchBothRecs = useCallback(
  async id => {
    setRecsLoading(true);
    setAiRecsLoading(true);

    const [recRes, aiRes] = await Promise.allSettled([
      dispatch(getSoilRecommendations(deviceId, id)),
      dispatch(getSoilAIRecommendations(deviceId, id)),
    ]);

    if (recRes.status === 'fulfilled')
      setRecs(recRes.value?.payload?.data ?? recRes.value?.data ?? null);
    setRecsLoading(false);

    if (aiRes.status === 'fulfilled')
      setAiRecs(aiRes.value?.payload?.data ?? aiRes.value?.data ?? null);
    setAiRecsLoading(false);

    setPhase('done');
  },
  [deviceId],
);

// ── Check for soilData and trigger save ────────────────────────────────
useEffect(() => {
  Animated.timing(headerAnim, {
    toValue: 1,
    duration: 500,
    useNativeDriver: true,
  }).start();
}, []);

// Separate effect to handle saving when data is available
useEffect(() => {
  if (soilData && deviceId && !hasAttemptedSave) {
    console.log('[SoilResults] Data available, attempting to save...');
    saveReading();
  } else if (soilData && !deviceId) {
    console.log('[SoilResults] Data available but no device ID');
  } else if (!soilData) {
    console.log('[SoilResults] No soil data available yet');
  }
}, [soilData, deviceId, hasAttemptedSave, saveReading]);

// ── react to print status coming back from the device ──────────────────
useEffect(() => {
  if (!printStatus) return;
  if (printStatus.status === 'printing') {
    setPrintRequesting(false);
  } else if (printStatus.status === 'done') {
    setPrintRequesting(false);
  } else if (printStatus.status === 'error') {
    setPrintRequesting(false);
    Alert.alert(
      'Print failed',
      printStatus.message || 'Could not print the report. Please retry.',
    );
  }
}, [printStatus]);

// ── FIX: safety timeout — if the device never responds at all (out of
// range, firmware hung, BLE write dropped, etc.) the button used to spin
// forever because it was purely waiting on a printStatus update. Now it
// gives up and re-enables itself after PRINT_TIMEOUT_MS.
useEffect(() => {
  if (!printRequesting) return;
  const timer = setTimeout(() => {
    setPrintRequesting(false);
    Alert.alert(
      'Print timed out',
      'No response from the printer. Check that the device is connected and try again.',
    );
  }, PRINT_TIMEOUT_MS);
  return () => clearTimeout(timer);
}, [printRequesting]);

// ── PDF download ─────────────────────────────────────────────────────────
const handleDownload = useCallback(async () => {
  setPdfLoading(true);
  try {
    await generatePDFReport({ mapped, recs, aiText, callId, healthPct, T });
  } catch (e) {
    Alert.alert('Export failed', e?.message ?? 'Unknown error');
  } finally {
    setPdfLoading(false);
  }
}, [mapped, recs, aiText, callId, healthPct, T]);

// ── FIX: send print command to the device — pure trigger, no payload ───
// Previously this built a big printPayload (all nutrients + fertilizer
// schedule + AI insights paragraph) and sent it over BLE as the SOILPRINT
// command's `data`. That payload could easily run several KB, well past
// what a single BLE characteristic write can carry — the write was
// silently dropped/truncated, the Pi never assembled a complete command,
// and nothing was ever notified back, which is why the button span
// forever and the printer never started.
//
// The Raspberry Pi already has this exact reading in memory (it's what
// its own on-screen "PRINT RECEIPT" button prints from), so we don't need
// to send anything except the trigger. See cmdPrintSoilResult() in
// bleActions.js and _run_ble_soil_print_workflow() in main_ble.py.
const handlePrint = useCallback(() => {
  if (!connected) {
    Alert.alert(
      'Not connected',
      'Connect to your SoilLenz device before printing.',
    );
    return;
  }

  setPrintRequesting(true);
  dispatch(cmdPrintSoilResult());
}, [connected, dispatch]);

const printing =
  printRequesting || printStatus?.status === 'printing';

// ── Check if we have any data to show ──────────────────────────────────
const hasData = soilData && Object.keys(soilData).length > 0;
const hasMappedData = mapped.some(m => m.value !== null);

// ─────────────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────────────
return (
  <SafeAreaView style={[s.root, { backgroundColor: T.bg }]}>
    <StatusBar barStyle="light-content" backgroundColor={T.bg} />

    <TopBar
      title="Soil Results"
      onBack={() => navigation.goBack()}
      theme={theme}
    />

    {/* onRetry points at retrySave (which just clears hasAttemptedSave).
        The effect above is what actually re-invokes saveReading, exactly
        once, when hasAttemptedSave flips back to false. */}
    <PhaseBanner phase={phase} onRetry={retrySave} />

    {/* Show message if no data */}
    {!hasData && phase === 'idle' && (
      <View style={s.noDataContainer}>
        <Text style={[s.noDataText, { color: T.textSub }]}>
          No soil data available. Please go back and run the sensor test.
        </Text>
        <AppButton
          label="Go to Sensor"
          onPress={() => navigation.navigate('SensorScreen')}
          color={T.primary}
          textColor="#fff"
          style={{ marginTop: 16 }}
        />
      </View>
    )}

    {/* Show data if available */}
    {hasData && (
      <>
        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <View style={[s.tabRow, { borderBottomColor: T.border ?? '#1C2733' }]}>
          {['nutrients', 'charts', 'recs'].map(t => (
            <TabPill
              key={t}
              label={
                t === 'recs' ? 'Recs' : t.charAt(0).toUpperCase() + t.slice(1)
              }
              active={tab === t}
              onPress={() => setTab(t)}
              T={T}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { padding: PAD }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HEALTH SCORE CARD ──────────────────────────────────────────── */}
          <Animated.View
            style={[
              s.scoreCard,
              {
                backgroundColor: T.card,
                borderColor: T.border ?? '#1C2733',
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={s.ringWrap}>
              <HealthRing
                pct={healthPct}
                color={healthColor}
                borderColor={T.border ?? '#1C2733'}
                size={90}
              />
              <View style={s.ringInner}>
                <Text style={[s.ringPct, { color: healthColor }]}>
                  {healthPct}%
                </Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[Typography.h3 ?? {}, s.scoreTitle, { color: T.text }]}
              >
                Soil Health
              </Text>
              <Text style={[s.scoreSub, { color: T.textSub }]}>
                {optimal} / {scored.length} nutrients optimal
              </Text>
              {callId ? (
                <Text style={[s.scoreId, { color: T.muted }]}>
                  Reading #{callId}
                </Text>
              ) : null}
              <View
                style={[
                  s.scorePill,
                  {
                    backgroundColor: healthColor + '1A',
                    borderColor: healthColor + '55',
                  },
                ]}
              >
                <Text style={[s.scorePillTxt, { color: healthColor }]}>
                  {healthPct >= 70
                    ? '🌱 Healthy Soil'
                    : healthPct >= 40
                    ? '⚠️ Needs Attention'
                    : '🔴 Poor Condition'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════════
              TAB: NUTRIENTS
          ══════════════════════════════════════════════════════════════════ */}
          {tab === 'nutrients' && (
            <>
              <SectionHead
                title="Test Summary"
                sub="Here are your soil nutrient levels"
                T={T}
              />

              <SectionHead
                title="Macronutrients"
                sub="pH · EC · OC · N · P · K"
                T={T}
              />
              <View style={s.grid}>
                {mapped
                  .filter(m =>
                    [
                      'ph',
                      'ec',
                      'OC',
                      'N',
                      'P',
                      'K',
                    ].includes(m.key),
                  )
                  .map((item, i) => (
                    <NutrientCard key={item.key} item={item} idx={i} T={T} />
                  ))}
              </View>

              <SectionHead
                title="Secondary Nutrients"
                sub="Calcium · Magnesium · Sulphur"
                T={T}
              />
              <View style={s.grid}>
                {mapped
                  .filter(m =>
                    ['Ca', 'Mg', 'S'].includes(m.key),
                  )
                  .map((item, i) => (
                    <NutrientCard key={item.key} item={item} idx={i} T={T} />
                  ))}
              </View>

              <SectionHead
                title="Micronutrients"
                sub="Zn · Mn · Fe · Cu · B"
                T={T}
              />
              <View style={s.grid}>
                {mapped
                  .filter(m =>
                    ['Zn', 'Mn', 'Fe', 'Cu', 'B'].includes(
                      m.key,
                    ),
                  )
                  .map((item, i) => (
                    <NutrientCard key={item.key} item={item} idx={i} T={T} />
                  ))}
              </View>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: CHARTS
          ══════════════════════════════════════════════════════════════════ */}
          {tab === 'charts' && (
            <>
              <SectionHead
                title="Macronutrient Radar"
                sub="N · P · K · Ca · Mg · S  —  normalised to 100"
                T={T}
              />
              <View
                style={[
                  s.chartCard,
                  { backgroundColor: T.card, borderColor: T.border ?? '#1C2733' },
                ]}
              >
                <RadarChart mapped={mapped} T={T} />
              </View>

              <SectionHead
                title="Micronutrient Profile"
                sub="Relative comparison"
                T={T}
              />
              <View
                style={[
                  s.chartCard,
                  { backgroundColor: T.card, borderColor: T.border ?? '#1C2733' },
                ]}
              >
                <MicroBarChart mapped={mapped} T={T} />
              </View>

              <SectionHead
                title="Soil Chemistry"
                sub="pH · EC · OC animated bars"
                T={T}
              />
              {['ph', 'ec', 'OC'].map(k => {
                const item = mapped.find(m => m.key === k);
                const st = getStatus(k, item?.value, T.muted);
                const maxV = k === 'ph' ? 14 : k === 'ec' ? 3 : 5;
                return (
                  <View
                    key={k}
                    style={[
                      s.chemRow,
                      {
                        backgroundColor: T.card,
                        borderColor: T.border ?? '#1C2733',
                      },
                    ]}
                  >
                    <Text style={[s.chemKey, { color: T.textSub }]}>
                      {item?.label ?? k.toUpperCase()}
                    </Text>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <AnimBar
                        value={item?.value}
                        max={maxV}
                        color={st.color}
                        trackColor={T.border ?? '#1C2733'}
                      />
                    </View>
                    <Text style={[s.chemVal, { color: st.color }]}>
                      {formatValue(item?.value)}
                      {item?.unit ? ` ${item.unit}` : ''}
                    </Text>
                    <View
                      style={[s.chemBadge, { backgroundColor: st.color + '22' }]}
                    >
                      <Text style={[s.chemBadgeTxt, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: RECOMMENDATIONS
          ══════════════════════════════════════════════════════════════════ */}
          {tab === 'recs' && (
            <>
              {/* Fertilizer */}
              <View
                style={[
                  s.recCard,
                  {
                    backgroundColor: T.card,
                    borderColor: STATUS_COLORS.green + '44',
                  },
                ]}
              >
                <View
                  style={[
                    s.recHead,
                    {
                      backgroundColor: T.bg,
                      borderBottomColor: STATUS_COLORS.green + '33',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>🌾</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.recTitle, { color: STATUS_COLORS.green }]}>
                      Fertilizer Recommendations
                    </Text>
                    <Text style={[s.recSub, { color: T.textSub }]}>
                      Crop: {recs?.crop_type ?? route?.params?.cropType ?? '—'}
                    </Text>
                  </View>
                  {recsLoading && (
                    <ActivityIndicator size="small" color={STATUS_COLORS.green} />
                  )}
                </View>

                {recsLoading ? (
                  <View style={s.loadBox}>
                    <ActivityIndicator color={STATUS_COLORS.green} />
                    <Text style={[s.loadTxt, { color: T.textSub }]}>
                      Calculating dosage…
                    </Text>
                  </View>
                ) : recs?.recommendations ? (
                  <View style={{ padding: 12 }}>
                    {recs.npk && (
                      <>
                        <Text style={[s.subHead, { color: T.textSub }]}>
                          Soil Nutrient Levels
                        </Text>
                        <NPKPills npk={recs.npk} T={T} />
                      </>
                    )}
                    <Text style={[s.subHead, { color: T.textSub }]}>
                      FYM / Organic
                    </Text>
                    <FYMBlock data={recs.recommendations.fym} T={T} />
                    <Text style={[s.subHead, { color: T.textSub }]}>
                      📅 Year-wise Schedule
                    </Text>
                    <FertilizerTable
                      data={recs.recommendations.crop_fertilizer}
                      T={T}
                    />
                  </View>
                ) : (
                  <View style={s.emptyBox}>
                    <Text style={[s.emptyTxt, { color: T.muted }]}>
                      {phase === 'error'
                        ? 'Failed to load. Tap the banner above to retry.'
                        : 'Recommendations not yet available.'}
                    </Text>
                  </View>
                )}
              </View>

              {/* AI */}
              <View
                style={[
                  s.recCard,
                  {
                    backgroundColor: T.card,
                    borderColor: STATUS_COLORS.purple + '44',
                  },
                ]}
              >
                <View
                  style={[
                    s.recHead,
                    {
                      backgroundColor: T.bg,
                      borderBottomColor: STATUS_COLORS.purple + '33',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>🤖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.recTitle, { color: STATUS_COLORS.purple }]}>
                      AI-Powered Insights
                    </Text>
                    <Text style={[s.recSub, { color: T.textSub }]}>
                      Personalised advisory
                    </Text>
                  </View>
                  {aiRecsLoading && (
                    <ActivityIndicator
                      size="small"
                      color={STATUS_COLORS.purple}
                    />
                  )}
                </View>

                {aiRecsLoading ? (
                  <View style={s.loadBox}>
                    <ActivityIndicator color={STATUS_COLORS.purple} />
                    <Text style={[s.loadTxt, { color: T.textSub }]}>
                      Generating AI insights…
                    </Text>
                  </View>
                ) : aiText ? (
                  <Text style={[s.aiBody, { color: T.textSub }]}>{aiText}</Text>
                ) : (
                  <View style={s.emptyBox}>
                    <Text style={[s.emptyTxt, { color: T.muted }]}>
                      {phase === 'error'
                        ? 'AI insights unavailable.'
                        : 'AI analysis pending…'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Print + Download PDF buttons */}
              <PrintButton
                onPress={handlePrint}
                loading={printing}
                disabled={!connected}
                T={T}
              />
              <DownloadButton
                onPress={handleDownload}
                loading={pdfLoading}
                T={T}
              />
            </>
          )}

          {/* Print + Download buttons also visible on other tabs for convenience */}
          {tab !== 'recs' && phase === 'done' && (
            <>
              <PrintButton
                onPress={handlePrint}
                loading={printing}
                disabled={!connected}
                T={T}
              />
              <DownloadButton onPress={handleDownload} loading={pdfLoading} T={T} />
            </>
          )}
        </ScrollView>
      </>
    )}
  </SafeAreaView>
);
}

export default SoilResultsScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  — add noData styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
root: { flex: 1 },

tabRow: {
  flexDirection: 'row',
  gap: 8,
  paddingHorizontal: PAD,
  paddingVertical: 12,
  borderBottomWidth: 1,
},

scroll: { paddingBottom: 52 },

// ── No data container
noDataContainer: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: PAD,
  marginTop: 40,
},
noDataText: {
  fontSize: 16,
  textAlign: 'center',
  lineHeight: 24,
},

// ── health card
scoreCard: {
  borderRadius: 18,
  borderWidth: 1,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 20,
  gap: 16,
},
ringWrap: { position: 'relative', width: 90, height: 90 },
ringInner: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
},
ringPct: { fontSize: 18, fontWeight: '900', letterSpacing: -1 },
scoreTitle: { fontSize: 16, fontWeight: '800' },
scoreSub: { fontSize: 12, marginTop: 2 },
scoreId: { fontSize: 10, marginTop: 1 },
scorePill: {
  alignSelf: 'flex-start',
  borderRadius: 20,
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginTop: 6,
},
scorePillTxt: { fontSize: 11, fontWeight: '700' },

// ── grid
grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: 18,
},

// ── chart card
chartCard: {
  borderRadius: 16,
  borderWidth: 1,
  padding: 16,
  alignItems: 'center',
  marginBottom: 18,
},

// ── chemistry rows
chemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 12,
  borderWidth: 1,
  padding: 12,
  marginBottom: 8,
},
chemKey: { fontSize: 12, fontWeight: '700', width: 40 },
chemVal: { fontSize: 12, fontWeight: '800', width: 72, textAlign: 'right' },
chemBadge: {
  marginLeft: 8,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 3,
},
chemBadgeTxt: { fontSize: 10, fontWeight: '700' },

// ── rec cards
recCard: {
  borderRadius: 16,
  borderWidth: 1,
  overflow: 'hidden',
  marginBottom: 16,
},
recHead: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  padding: 14,
  borderBottomWidth: 1,
},
recTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
recSub: { fontSize: 11, marginTop: 1 },

subHead: {
  fontSize: 11,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  marginBottom: 8,
  marginTop: 12,
},

aiBody: { fontSize: 13, lineHeight: 21, padding: 14 },

loadBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  padding: 20,
  justifyContent: 'center',
},
loadTxt: { fontSize: 13 },

emptyBox: { padding: 20, alignItems: 'center' },
emptyTxt: { fontSize: 13, fontStyle: 'italic' },
});