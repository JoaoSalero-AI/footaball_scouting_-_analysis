// app.js (CONTROLLER + VIEW)
import { CONFIG, PLAYER, SEASONS, SEASON_ORDER } from "./data.js";

/* ========= MODEL HELPERS ========= */

function parseISO(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m-1, d));
}

function seasonStartYear(seasonKey){
  return Number(seasonKey.split("/")[0]);
}

function refDateForSeason(seasonKey){
  if (seasonKey === CONFIG.DEFAULT_SEASON) return parseISO(CONFIG.FROZEN_TODAY_ISO);
  const y = seasonStartYear(seasonKey);
  return new Date(Date.UTC(y, CONFIG.PAST_REF_MONTH-1, CONFIG.PAST_REF_DAY));
}

function ageAt(dobISO, ref){
  const dob = parseISO(dobISO);
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const m = ref.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

/* ========= VIEW HELPERS ========= */

const el = (id)=>document.getElementById(id);

function setText(id, v){
  const n = el(id);
  if (!n) return;
  n.textContent = (v === null || v === undefined) ? "—" : String(v);
}

function fmtPct(n){
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function fmt2(n){
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(2);
}

function fmt1(n){
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(1);
}

/* ========= CHARTS (Canvas) ========= */

const PALETTE = {
  blue: "#004D98",
  maroon: "#A50044",
  gold: "#EDBB00",
  ink: "#111111",
  muted: "#58626d",
};

function clear(ctx,w,h){ ctx.clearRect(0,0,w,h); }

function axes(ctx,w,h,p){
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(p,p);
  ctx.lineTo(p,h-p);
  ctx.lineTo(w-p,h-p);
  ctx.stroke();
}

function yLabel(ctx, text, x, y){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function lineChart(canvasId, labels, values, yText){
  const c = el(canvasId);
  const ctx = c.getContext("2d");
  const w=c.width, h=c.height;
  const p=34;

  clear(ctx,w,h);
  axes(ctx,w,h,p);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min - 5;
  const yMax = max + 5;

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "11px Arial";
  yLabel(ctx, yText, 12, h/2+20);

  const step = (w-2*p)/(labels.length-1);

  ctx.strokeStyle = PALETTE.maroon;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((v,i)=>{
    const x = p + i*step;
    const y = (h-p) - ((v-yMin)/(yMax-yMin))*(h-2*p);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  values.forEach((v,i)=>{
    const x = p + i*step;
    const y = (h-p) - ((v-yMin)/(yMax-yMin))*(h-2*p);

    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = PALETTE.ink;
    ctx.font = "11px Arial";
    ctx.fillText(labels[i], x-18, h-10);
    ctx.fillText(`${v.toFixed(1)}%`, x-18, y-10);
  });
}

function barChart(canvasId, labels, values, yText){
  const c = el(canvasId);
  const ctx = c.getContext("2d");
  const w=c.width, h=c.height;
  const p=34;

  clear(ctx,w,h);
  axes(ctx,w,h,p);

  const max = Math.max(...values, 1);
  const slot = (w-2*p)/labels.length;
  const bw = slot*0.55;

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "11px Arial";
  yLabel(ctx, yText, 12, h/2+20);

  labels.forEach((lab,i)=>{
    const x0 = p + i*slot + (slot-bw)/2;
    const bh = (values[i]/max)*(h-2*p);
    const y0 = (h-p)-bh;

    ctx.fillStyle = PALETTE.blue;
    ctx.fillRect(x0,y0,bw,bh);

    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0,y0,bw,bh);

    ctx.fillStyle = PALETTE.ink;
    ctx.font = "11px Arial";
    ctx.fillText(lab, x0-2, h-10);
    ctx.fillText(String(values[i]), x0 + bw/2 - 4, y0 - 8);
  });
}

function renderCharts(){
  const labels = SEASON_ORDER;
  const sdr = labels.map(s => SEASONS[s].dribbling.sdrPct);
  const gi  = labels.map(s => SEASONS[s].additional.gi);

  lineChart("chartSdr", labels, sdr, "SDR%");
  barChart("chartGi", labels, gi, "GI (G+A)");
}

/* ========= RENDER ========= */

function renderStatic(){
  setText("pName", PLAYER.name);
  setText("pNat", PLAYER.nationality);
  setText("pDob", "03 Jun 2005");
  setText("pHw", `${PLAYER.heightCm} cm / ${PLAYER.weightKg} kg`);
  setText("pFoot", PLAYER.preferredFoot);
  setText("pShirt", PLAYER.shirtNumber);
  setText("pPos", PLAYER.primaryPosition);
  setText("pValue", PLAYER.marketValue);
  setText("pNT", PLAYER.nationalTeam);
  setText("pTransfers", PLAYER.transfers.join(" | "));

  setText("txtPhysical", PLAYER.reportText.physical);
  setText("txtTechnical", PLAYER.reportText.technical);
  setText("txtTactical", PLAYER.reportText.tactical);
  setText("txtOpinion", PLAYER.reportText.opinion);

  // pitch dot default
  const dot = el("posDot");
  dot.style.left = `${PLAYER.pitchDot.leftPct}%`;
  dot.style.top  = `${PLAYER.pitchDot.topPct}%`;
  setText("posTag", "RW");
}

function buildSdrContext(seasonKey){
  const s = SEASONS[seasonKey];
  const pct = s.dribbling.sdrPct;

  const [l1Low, l1High] = CONFIG.LIGUE1_AVG_WINGER_SDR_PCT_RANGE;
  const good = CONFIG.EURO_TOP_WINGER_SDR_PCT_GOOD;
  const diff = CONFIG.EURO_TOP_WINGER_SDR_PCT_DIFFERENTIATOR;
  const elite = CONFIG.EURO_TOP_WINGER_SDR_PCT_ELITE;

  let band = "below average";
  if (pct >= l1Low && pct <= l1High) band = "around Ligue 1 average";
  else if (pct > l1High && pct < diff) band = "good (above Ligue 1 average)";
  else if (pct >= diff && pct < elite) band = "very good (European differentiator range)";
  else if (pct >= elite) band = "elite (outstanding dribbling range)";

  return `Definition:
• SDR% (Successful Dribble Rate) = successful dribbles / attempted dribbles. It measures 1v1 dribble efficiency (not physical duels).

Benchmarks (heuristic bands used for scouting context):
• Typical Ligue 1 winger baseline: ~${l1Low}–${l1High}% SDR
• Top-club winger (European level): ${good}%+ is “good”, ${diff}%+ is a differentiator, ${elite}%+ is elite

Current season selected (${seasonKey}):
• Doué SDR%: ${pct.toFixed(1)}% → ${band}
• Volume indicator: ${s.dribbling.sdrPerMatch.toFixed(1)} successful dribbles per match
Note: maintaining a high SDR% with meaningful volume is the key signal for “outstanding dribbling ability.”`;
}

function renderSeason(seasonKey){
  const s = SEASONS[seasonKey];
  if (!s) return;

  setText("chipSeason", `Season: ${seasonKey}`);
  setText("pClub", s.club);
  setText("pLeague", s.league);

  const ref = refDateForSeason(seasonKey);
  const age = ageAt(PLAYER.dobISO, ref);
  setText("pAge", `${age} (ref: ${ref.toISOString().slice(0,10)})`);

  const note = (seasonKey === CONFIG.DEFAULT_SEASON)
    ? `Default view uses frozen date ${CONFIG.FROZEN_TODAY_ISO} for reproducibility.`
    : `Age reference for past seasons: 01/08/${seasonStartYear(seasonKey)}.`;
  setText("ageRefNote", note);

  // KPIs
  setText("kpiMp", s.general.mp);
  setText("kpiMin", s.general.min);
  setText("kpiGls", s.general.gls);
  setText("kpiAst", s.general.ast);
  setText("kpiRating", fmt2(s.general.rating));

  setText("kpiSdrPct", fmtPct(s.dribbling.sdrPct));
  setText("kpiSdrVol", `${fmt1(s.dribbling.sdrPerMatch)} successful dribbles / match`);

  setText("kpiXg", s.additional
