# Neon Beat Synth

Client-side drum machine and melody synthesizer. Next.js + Tailwind. Web Audio API synthesizes every sound, no audio files, no backend.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3001.

## Features

- 4x4 grid of 16 colorful neon pads (kick, snare, hats, clap, toms, cowbell, rim, crash, ride, shaker, bass, zap, laser)
- Click a pad: plays the sound + ripple/glow animation
- One-octave playable piano keyboard for real-time notes
- Sine, saw, and square synth waves built from Web Audio oscillators
- Melody recording into synth sequencer rows that loop alongside drums
- Drum and melody step sequencer, 8 beats per bar
- Play/Stop, BPM slider (60-200), Clear
