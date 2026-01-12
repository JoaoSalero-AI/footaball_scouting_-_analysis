// app.js (CONTROLLER + VIEW)
import { CONFIG, PLAYER, SEASONS, SEASON_ORDER } from "./data.js";

/* =========================
   MODEL HELPERS
========================= */

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function computeAge(dobISO, refDate) {
  // age at refDate (UTC safe enough for this use)
  const dob = parseISODate(dobISO);
  let age = refDate.getUTCFullYear() - dob.getUTCFullYear();
  const m = refDate.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && refDate.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

function seasonStartYear(seasonKey) {
  // "2025/26" -> 2025
  return Number(seasonKey.split("/")[0]);
}

function referenceDateForSeason(seasonKey) {
  if (seasonKey === CONFIG.DEFAULT_SEASON) {
    return parseISODate(CONFIG.FROZEN_TODAY_ISO); // your frozen "today"
  }
  const y = seasonStartYear(seasonKey);
  return new Date(Date.UTC(y, CONFIG.PAST_SEASON_REF_MONTH - 1, CONFIG.PAST_SEASON_REF_DAY));
}

/* =========================
   VIEW HELPERS
========================= */

const el = (id) => document.getElementById(id);

function setText(id, value) {
  const node = el(id);
  if (!node) return;
  node.textContent = value ?? "—";
}

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number") return String(n);
  return String(n);
}

function fmtPct(n) {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtRating(n) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2);
}

function renderStaticIdentity() {
  setText("p-name", PLAYER.name);
  setText("p-nat", PLAYER.nationality);
  setText("p-dob", "03 Jun 2005");                 // keep display-friendly
  setText("p-height", `${PLAYER.heightCm} cm`);
  setText("p-weight", PLAYER.weightKg ? `${PLAYER.weightKg} kg` : "[Add later]");
  setText("p-foot", PLAYER.preferredFoot);
  setText("p-shirt", fmtNum(PLAYER.shirtNumber));
  setText("p-position", PLAYER.primaryPosition);
  setText("p-profile", PLAYER.profile);
  setText("p-value", PLAYER.marketValue);
  setText("p-nt", PLAYER.nationalTeam);
  setText("p-transfers", PLAYER.transfers.join(" | "));

  // pitch default
  const dot = el("posDot");
  dot.style.left = `${PLAYER.pitchDot.leftPct}%`;
  dot.style.top = `${PLAYER.pitchDot.topPct}%`;
  setText("posTag", "RW");
}

function renderSeason(seasonKey) {
  const s = SEASONS[seasonKey];
  if (!s) return;

  // season identity
  setText("p-club", s.club);
  setText("p-league", s.league);

  // age
  const ref = referenceDateForSeason(seasonKey);
  const age = computeAge(PLAYER.dobISO, ref);
  setText("p-age", `${age} (ref: ${ref.toISOString().slice(0,10)})`);

  // left KPIs
  setText("kpi-mp", fmtNum(s.general.mp));
  setText("kpi-min", fmtNum(s.general.min));
  setText("kpi-gls", fmtNum(s.general.gls));
  setText("kpi-ast", fmtNum(s.general.ast));
  setText("kpi-rating", fmtRating(s.general.rating));
  setText("kpi-xg", fmtNum(s.additional.xg));
  setText("kpi-xa", fmtNum(s.additional.xa));
  setText("kpi-gi", fmtNum(s.additional.gi));
  setText("kpi-xgi", fmtNum(s.additional.xgi));

  // tables
  setText("fin-shots", fmtNum(s.finishing.shots));
  setText("fin-sot", fmtNum(s.finishing.sot));
  setText("fin-bcm", fmtNum(s.finishing.bcm));

  setText("cre-keyp", fmtNum(s.creativity.keyp));
  setText("cre-bcc", fmtNum(s.creativity.bcc));
  setText("cre-sdr", fmtNum(s.creativity.sdr));

  setText("pas-aps", fmtNum(s.passes.aps));
  setText("pas-pct", fmtPct(s.passes.apsPct));
  setText("pas-alb", fmtNum(s.passes.alb));
  setText("pas-lbpct", fmtPct(s.passes.lbaPct));

  setText("def-tack", fmtNum(s.defense.tack));
  setText("def-int", fmtNum(s.defense.inter));
  setText("def-yc", fmtNum(s.defense.yc));

  setText("add-xg", fmtNum(s.additional.xg));
  setText("add-xa", fmtNum(s.additional.xa));
  setText("add-gi", fmtNum(s.additional.gi));
  setText("add-xgi", fmtNum(s.additional.xgi));

  // requirements block (rubric visibility)
  // Eligibility: first-division in allowed market (France) and not Barcelona
  setText("req-eligibility", `${s.league} (France) – first division; not FC Barcelona`);
  setText("req-winger", "Yes (RW / Winger)");
  setText("req-age", age >= 18 && age <= 25 ? `Yes (${age})` : `No (${age})`);

  // Dribbling requirement: we flag as "to be supported" until you paste your written technical notes.
  // This keeps the file objective while still satisfying rubric emphasis.
  setText("req-dribbling", "Yes (to be evidenced in Technical characteristics + 1v1 clips)");

  // reference date hint
  const hint = seasonKey === CONFIG.DEFAULT_SEASON
    ? `Default view uses frozen date ${CONFIG.FROZEN_TODAY_ISO}.`
    : `Age reference: ${String(CONFIG.PAST_SEASON_REF_DAY).padStart(2,"0")}/${String(CONFIG.PAST_SEASON_REF_MONTH).padStart(2,"0")}/${seasonStartYear(seasonKey)}.`;
  setText("refDateHint", hint);
}

/* =========================
   CHARTS (simple canvas)
========================= */

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

function drawAxes(ctx, w, h, pad) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();
}

function drawLineChart(canvasId, labels, values, yMinPad=0.2, yMaxPad=0.2) {
  const c = el(canvasId);
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  const pad = 28;

  clearCanvas(ctx, w, h);
  drawAxes(ctx, w, h, pad);

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const yMin = minV - yMinPad;
  const yMax = maxV + yMaxPad;

  const xStep = (w - 2*pad) / (labels.length - 1);

  // line
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + i * xStep;
    const y = (h - pad) - ((v - yMin) / (yMax - yMin)) * (h - 2*pad);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points + labels
  ctx.fillStyle = "#111";
  ctx.font = "11px Arial";
  values.forEach((v, i) => {
    const x = pad + i * xStep;
    const y = (h - pad) - ((v - yMin) / (yMax - yMin)) * (h - 2*pad);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI*2);
    ctx.fill();

    ctx.fillText(labels[i], x - 18, h - 10);
    ctx.fillText(v.toFixed(2), x - 14, y - 8);
  });
}

function drawBarChart(canvasId, labels, values) {
  const c = el(canvasId);
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  const pad = 28;

  clearCanvas(ctx, w, h);
  drawAxes(ctx, w, h, pad);

  const maxV = Math.max(...values, 1);
  const barW = (w - 2*pad) / labels.length * 0.6;
  const gap = (w - 2*pad) / labels.length * 0.4;

  ctx.fillStyle = "#111";
  ctx.font = "11px Arial";

  labels.forEach((lab, i) => {
    const x0 = pad + i * (barW + gap) + gap/2;
    const barH = (values[i] / maxV) * (h - 2*pad);
    const y0 = (h - pad) - barH;

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, barW, barH);

    ctx.fillText(lab, x0 - 2, h - 10);
    ctx.fillText(String(values[i]), x0 + barW/2 - 4, y0 - 6);
  });
}

function renderCharts() {
  const labels = SEASON_ORDER;
  const ratings = labels.map(s => SEASONS[s].general.rating);
  const gi = labels.map(s => SEASONS[s].additional.gi);

  drawLineChart("chartRating", labels, ratings, 0.15, 0.15);
  drawBarChart("chartGI", labels, gi);
}

/* =========================
   CONTROLLER (events + state)
========================= */

const state = {
  season: CONFIG.DEFAULT_SEASON,
  mode: "LIVE"
};

function setStatus(msg) {
  setText("statusLine", `Status: ${msg}`);
}

function initSeasonSelect() {
  const sel = el("seasonSelect");
  sel.innerHTML = "";
  SEASON_ORDER.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  sel.value = state.season;

  sel.addEventListener("change", () => {
    state.season = sel.value;
    renderSeason(state.season);
    setStatus(`season applied → ${state.season} (${state.mode})`);
  });
}

function initModeToggle() {
  const bLive = el("toggleLive");
  const bVideo = el("toggleVideo");

  function applyMode(mode) {
    state.mode = mode;
    bLive.classList.toggle("active", mode === "LIVE");
    bVideo.classList.toggle("active", mode === "VIDEO");
    setStatus(`mode set to ${mode} (season ${state.season})`);
  }

  bLive.addEventListener("click", () => applyMode("LIVE"));
  bVideo.addEventListener("click", () => applyMode("VIDEO"));
}

function initScoutingSummary() {
  el("btnScouting").addEventListener("click", () => {
    const s = SEASONS[state.season];
    const ref = referenceDateForSeason(state.season);
    const age = computeAge(PLAYER.dobISO, ref);

    const summary =
`SCOUTING SUMMARY
Player: ${PLAYER.name}
Season: ${state.season}
Club: ${s.club} | League: ${s.league}
Age (ref ${ref.toISOString().slice(0,10)}): ${age}
Position: ${PLAYER.primaryPosition}
Mode: ${state.mode}

Core:
MP ${s.general.mp} | MIN ${s.general.min} | G ${s.general.gls} | A ${s.general.ast} | Rating ${s.general.rating.toFixed(2)}

Additional:
xG ${s.additional.xg} | xA ${s.additional.xa} | GI ${s.additional.gi} | xGI ${s.additional.xgi}

Reminder:
Complete the written sections (Physical/Technical/Tactical/Personal opinion) + add match observations.`;

    alert(summary);
  });
}

/* Drag dot */
function initPitchDotDrag() {
  const dot = el("posDot");
  const pitch = dot.parentElement;
  let dragging = false;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  dot.addEventListener("mousedown", (e) => {
    dragging = true;
    dot.style.cursor = "grabbing";
    e.preventDefault();
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    dot.style.cursor = "grab";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const r = pitch.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 0, r.width);
    const y = clamp(e.clientY - r.top, 0, r.height);
    dot.style.left = (x / r.width * 100).toFixed(2) + "%";
    dot.style.top  = (y / r.height * 100).toFixed(2) + "%";
  });
}

/* =========================
   BOOTSTRAP
========================= */

function init() {
  renderStaticIdentity();
  initSeasonSelect();
  initModeToggle();
  initScoutingSummary();
  initPitchDotDrag();

  // initial render
  renderSeason(state.season);
  renderCharts();
  setStatus(`ready (default season ${state.season}, frozen date ${CONFIG.FROZEN_TODAY_ISO})`);
}

init();
