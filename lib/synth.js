let ctx = null;

export function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noiseBuffer(c, duration = 1) {
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function envGain(c, t, peak, attack, decay) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

export const SOUNDS = {
  kick: (c, t = c.currentTime) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.5);
  },
  snare: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.3);
    const nf = c.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.value = 1500;
    const ng = envGain(c, t, 0.7, 0.001, 0.18);
    n.connect(nf).connect(ng).connect(c.destination);

    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.1);
    const og = envGain(c, t, 0.5, 0.001, 0.12);
    o.connect(og).connect(c.destination);

    n.start(t); n.stop(t + 0.3);
    o.start(t); o.stop(t + 0.2);
  },
  hatClosed: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.1);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = envGain(c, t, 0.4, 0.001, 0.05);
    n.connect(f).connect(g).connect(c.destination);
    n.start(t); n.stop(t + 0.1);
  },
  hatOpen: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.4);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = envGain(c, t, 0.4, 0.001, 0.3);
    n.connect(f).connect(g).connect(c.destination);
    n.start(t); n.stop(t + 0.4);
  },
  clap: (c, t = c.currentTime) => {
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1200;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    [0, 0.01, 0.02, 0.04].forEach((d) => {
      g.gain.linearRampToValueAtTime(0.7, t + d + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
    });
    g.gain.linearRampToValueAtTime(0.5, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.3);
    n.connect(f).connect(g).connect(c.destination);
    n.start(t); n.stop(t + 0.3);
  },
  tomLow: (c, t = c.currentTime) => tom(c, t, 110, 60),
  tomMid: (c, t = c.currentTime) => tom(c, t, 180, 90),
  tomHigh: (c, t = c.currentTime) => tom(c, t, 260, 130),
  cowbell: (c, t = c.currentTime) => {
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = "square"; o2.type = "square";
    o1.frequency.value = 540;
    o2.frequency.value = 800;
    const g = envGain(c, t, 0.25, 0.001, 0.25);
    o1.connect(g); o2.connect(g);
    g.connect(c.destination);
    o1.start(t); o2.start(t);
    o1.stop(t + 0.3); o2.stop(t + 0.3);
  },
  rim: (c, t = c.currentTime) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = 1700;
    const g = envGain(c, t, 0.5, 0.001, 0.05);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.07);
  },
  crash: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 1.2);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 5000;
    const g = envGain(c, t, 0.4, 0.005, 1.0);
    n.connect(f).connect(g).connect(c.destination);
    n.start(t); n.stop(t + 1.2);
  },
  ride: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.6);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 4000;
    f.Q.value = 1.5;
    const g = envGain(c, t, 0.35, 0.005, 0.5);
    n.connect(f).connect(g).connect(c.destination);
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = 320;
    const og = envGain(c, t, 0.1, 0.005, 0.25);
    o.connect(og).connect(c.destination);
    n.start(t); n.stop(t + 0.6);
    o.start(t); o.stop(t + 0.3);
  },
  shaker: (c, t = c.currentTime) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.15);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 5500;
    const g = envGain(c, t, 0.35, 0.01, 0.12);
    n.connect(f).connect(g).connect(c.destination);
    n.start(t); n.stop(t + 0.15);
  },
  bass: (c, t = c.currentTime) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 600;
    const g = envGain(c, t, 0.6, 0.005, 0.35);
    o.connect(f).connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.5);
  },
  zap: (c, t = c.currentTime) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    const g = envGain(c, t, 0.4, 0.001, 0.2);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.25);
  },
  laser: (c, t = c.currentTime) => {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(900, t);
    o.frequency.linearRampToValueAtTime(1400, t + 0.15);
    const g = envGain(c, t, 0.25, 0.001, 0.15);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.18);
  },
};

function tom(c, t, startFreq, endFreq) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(startFreq, t);
  o.frequency.exponentialRampToValueAtTime(endFreq, t + 0.25);
  const g = envGain(c, t, 0.7, 0.005, 0.35);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + 0.5);
}

export const PADS = [
  { id: "kick", label: "KICK", color: "from-pink-500 to-fuchsia-600", glow: "rgba(236, 72, 153, 0.7)" },
  { id: "snare", label: "SNARE", color: "from-cyan-400 to-sky-600", glow: "rgba(34, 211, 238, 0.7)" },
  { id: "hatClosed", label: "HAT C", color: "from-lime-400 to-emerald-500", glow: "rgba(163, 230, 53, 0.7)" },
  { id: "hatOpen", label: "HAT O", color: "from-emerald-400 to-teal-600", glow: "rgba(52, 211, 153, 0.7)" },
  { id: "clap", label: "CLAP", color: "from-orange-400 to-red-500", glow: "rgba(251, 146, 60, 0.7)" },
  { id: "tomLow", label: "TOM L", color: "from-violet-500 to-purple-700", glow: "rgba(167, 139, 250, 0.7)" },
  { id: "tomMid", label: "TOM M", color: "from-fuchsia-500 to-purple-600", glow: "rgba(217, 70, 239, 0.7)" },
  { id: "tomHigh", label: "TOM H", color: "from-rose-400 to-pink-600", glow: "rgba(244, 114, 182, 0.7)" },
  { id: "cowbell", label: "COWBL", color: "from-yellow-400 to-amber-500", glow: "rgba(250, 204, 21, 0.7)" },
  { id: "rim", label: "RIM", color: "from-teal-400 to-cyan-600", glow: "rgba(45, 212, 191, 0.7)" },
  { id: "crash", label: "CRASH", color: "from-indigo-500 to-blue-700", glow: "rgba(99, 102, 241, 0.7)" },
  { id: "ride", label: "RIDE", color: "from-blue-400 to-indigo-600", glow: "rgba(96, 165, 250, 0.7)" },
  { id: "shaker", label: "SHAKE", color: "from-green-400 to-lime-600", glow: "rgba(74, 222, 128, 0.7)" },
  { id: "bass", label: "BASS", color: "from-purple-500 to-fuchsia-700", glow: "rgba(192, 132, 252, 0.7)" },
  { id: "zap", label: "ZAP", color: "from-red-400 to-rose-600", glow: "rgba(248, 113, 113, 0.7)" },
  { id: "laser", label: "LASER", color: "from-amber-400 to-orange-600", glow: "rgba(251, 191, 36, 0.7)" },
];
