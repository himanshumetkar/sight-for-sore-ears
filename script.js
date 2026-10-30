const $ = (s) => document.querySelector(s);

const cv = $("#stage");
const ctx = cv.getContext("2d");
const startBtn = $("#startBtn");
const modeSel = $("#modeSel");
const themeSel = $("#themeSel");
const smoothEl = $("#smooth");
const statusEl = $("#status");

const THEMES = {
  neon: { a: "#00ffcc", b: "#ff00ff", c: "#ff007f" },
  synthwave: { a: "#ff00ff", b: "#00ffff", c: "#ffff00" },
  matrix: { a: "#00ff00", b: "#00aa00", c: "#007700" },
  ember: { a: "#ff4500", b: "#ff6347", c: "#ff8c00" },
};

const MODES = ["bars", "radial", "scope", "city"];
const N = 64;
const BG = "11,15,25";

let mode = localStorage.getItem("nw-mode") || "bars";
let theme = localStorage.getItem("nw-theme") || "neon";

let actx, analyser, source, stream, freq, wave;
let running = false;
let W = 0,
  H = 0,
  dpr = 1;

const lv = new Float32Array(N);
const peaks = new Float32Array(N);
let edges = [];
let bass = 0,
  mid = 0,
  treb = 0,
  avgBass = 0;
let lastBeat = 0,
  shake = 0,
  glitch = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = `rgb(${BG})`;
  ctx.fillRect(0, 0, W, H);
}
addEventListener("resize", resize);

function buildEdges(bins) {
  const maxBin = Math.floor(bins * 0.8);
  edges = [0];
  for (let i = 1; i <= N; i++) {
    const e = Math.round(Math.pow(maxBin, i / N));
    edges.push(Math.max(e, edges[i - 1] + 1));
  }
}

function applyTheme(name) {
  theme = name;
  themeSel.value = name;
  const t = THEMES[name];
  const r = document.documentElement.style;
  r.setProperty("--a", t.a);
  r.setProperty("--b", t.b);
  r.setProperty("--c", t.c);
  localStorage.setItem("nw-theme", name);
}

function applyMode(name) {
  mode = name;
  modeSel.value = name;
  localStorage.setItem("nw-mode", name);
  ctx.fillStyle = `rgb(${BG})`;
  ctx.fillRect(0, 0, W, H);
}

const setStatus = (msg) => (statusEl.textContent = msg);

async function start() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return setStatus("Screen capture not supported in this browser.");
  }

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (e) {
    return setStatus("Cancelled or denied screen capture.");
  }

  const tracks = stream.getAudioTracks();
  if (!tracks.length) {
    stream.getTracks().forEach((t) => t.stop());
    return setStatus("No audio was seen in the screen capture...");
  }
  stream.getVideoTracks().forEach((t) => t.stop());

  actx = actx || new AudioContext();
  await actx.resume();

  analyser = actx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = parseFloat(smoothEl.value);
  freq = new Uint8Array(analyser.frequencyBinCount);
  wave = new Uint8Array(analyser.fftSize);
  buildEdges(analyser.frequencyBinCount);

  source = actx.createMediaStreamSource(new MediaStream(tracks));
  source.connect(analyser);
  tracks[0].addEventListener("ended", stop);

  running = true;
  startBtn.textContent = "Stop";
  startBtn.classList.add("live");
  setStatus("Running... (play some audio in the captured screen)");
}

function stop() {
  running = false;
  stream?.getTracks().forEach((t) => t.stop());
  source?.disconnect();
  startBtn.textContent = "Start";
  startBtn.classList.remove("live");
  setStatus("Stopped. Click start to capture screen and audio again.");
}

function analyse(t) {
  if (running) {
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(wave);

    for (let i = 0; i < N; i++) {
      let sum = 0,
        n = 0;
      for (let b = edges[i]; b < edges[i + 1]; b++) {
        sum += freq[b];
        n++;
      }
      lv[i] = n ? sum / n / 255 : 0;
    }
  } else {
    for (let i = 0; i < N; i++) {
      lv[i] =
        0.12 +
        0.1 * Math.sin(t * 0.001 + i * 0.5) * Math.sin(t * 0.0007 + i * 0.1);
    }
    if (!wave) wave = new Uint8Array(1024);
    for (let i = 0; i < wave.length; i++) {
      wave[i] = 123 + 18 * Math.sin(i * 0.05 + t * 0.0025);
    }
  }

  const avg = (a, b) => {
    let s = 0;
    for (let i = a; i < b; i++) s += lv[i];
    return s / (b - a);
  };

  bass = avg(0, 8);
  mid = avg(8, 32);
  treb = avg(32, N);

  avgBass += (bass - avgBass) * 0.05;

  if (
    running &&
    bass > avgBass * 1.25 + 0.05 &&
    bass > 0.35 &&
    t - lastBeat > 200
  ) {
    lastBeat = t;
    shake = 1;
    glitch = 1;
  }

  document.documentElement.style.setProperty("--pulse", bass.toFixed(2));
}

function bars() {
  const c = THEMES[theme];
  const bw = W / N;
  const maxH = H * 0.75;

  ctx.globalCompositeOperation = "lighter";
  [
    [-1, c.c, 0.7],
    [1, c.b, 0.7],
    [0, c.a, 1],
  ].forEach(([dir, col, alpha]) => {
    ctx.fillStyle = col;
    ctx.globalAlpha = alpha;
    const d = dir * (1 + bass * 9);
    for (let i = 0; i < N; i++) {
      ctx.fillRect(i * bw + d + 1, H - lv[i] * maxH, bw - 2, lv[i] * maxH);
    }
  });

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#fff";
  for (let i = 0; i < N; i++) {
    peaks[i] = Math.max(lv[i], peaks[i] - 0.006);
    ctx.fillRect(i * bw + 1, H - peaks[i] * maxH - 6, bw - 2, 3);
  }
}

function radial(t) {
  const c = THEMES[theme];
  const cx = W / 2;
  const cy = H / 2 + 20;
  const m = Math.min(W, H);
  const r0 = m * (0.15 + bass * 0.05);
  const R = m * 0.3;

  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, ((Math.PI * r0) / N) * 0.5);
  ctx.shadowBlur = 12;

  for (let k = 0; k < N * 2; k++) {
    const i = k < N ? k : 2 * N - 1 - k;
    const a = (k / (N * 2)) * Math.PI * 2 + t * 0.0002 - Math.PI / 2;
    const col = i < N * 0.3 ? c.c : i < N * 0.65 ? c.b : c.a;
    const len = r0 + 4 + lv[i] * R;

    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function city()
{
  const c =THEMES[theme], bw = W/N, maxH=H*0.62;
  const g = ctx.createRadialGradient(W*0.5, H*0.35, 0, W*0.35, H*(0.14 + bass * 0.1));
  g.addColorStop(0,c.c); g.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1;
  for (let i = 0; i<N; i++)
  {
    const h = 30+lv[i]*maxH, x = i*bw, y= H-H;
    ctx.fillStyle = 'rgb(8,11,20)'; ctx.fillRect(x,y,bw-1,h);
    ctx.fillStyle = i%2?c.a:c.b;
    for(let wy = y+8, row = 0; wy<H-6; wy+=12, row++)
    {
      if((i*31+row*17)%7<3) ctx.fillRect(x+3, wy, Math.max(2,bw-8),4);
    }
    ctx.fillStyle = c.a; ctx.fillRect(x,y,bw-1,2);
  }
}
const Draw = {bars, radial, scope, city};

function glitchSlices()
{
  for(let k = 0; k<4; k++)
  {
    const sy = Math.random()*H, sh = 8+Math.random()*40, dx = (Math.random()-0.5*70*glitch);
    ctx.drawImage(cv,0,sy*dpr,W*dpr,sh*dpr,dx,sy,W,sh)
  }
  glitch *= 0.85; if(glitch<0.05) glitch = 0;
}

function frame(t)
{
  analyse(t);
  ctx.fillStyle = 'rgba(${BG},0.24)'
  ctx.fillRect(0,0,W,H);
  ctx.save();
  if(shake >0.02) ctx.translate((Math.random()-0.5)*shake * 14, (Math.random()-0.5)*shake*14);
  shake*= 0.85;
  DRAW[mode](t);
  ctx.restore();
  if(glitch) glitchSlices();
  requiestAnimationFrame(frame);
}

startBtn.addEventListener('click',()=> (running?stop():start()));
modeSel.addEventListener('change',()=>applyMode(modeSel.value));
themeSel.addEventListener('change',()=>applyTheme(themeSel.value));
smoothEl,addEventListener('input', ()=>{if(analyser) analyser.smoothingTimeConstant=parseFloat(smoothEl.value);});
addEventListener('keydown',(e)=>{
  if(e.target.tagName==='SELECT') return;
 const k =e.key.toLowerCase();
 if(l>='1' && k<='4') applyMode(MODES[k-1]);
 else if (k==='t') {const n = Object.keys(THEMES); applyTheme(n[(N.indexOf(theme)+1)%N.length]); }
 else if(k==='f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
 else if(k==='h') document.body.classList.toggle('hidden');
});

buildEdges(512);
resize(); applyTheme(theme); applyMode(MODES.includes(mode)? mode:'bars');
requestAnimationFrame(frame);