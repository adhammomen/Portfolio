# Synthesizes the site's three short effects as 16-bit WAVs. The music itself is generated live in the browser (assets/js/music.js).
# Usage: python3 scripts/gen-sound.py <outdir>, then encode to assets/sound/*.mp3 with ffmpeg (libmp3lame, 128k).
import numpy as np, wave, sys, os
SR = 44100
out = sys.argv[1]
rng = np.random.default_rng(7)

def write(name, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    peak = np.max(np.abs(x)) or 1
    x = x / peak * 0.89
    with wave.open(os.path.join(out, name + '.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def onepole(x, a):  # simple low-pass, a in 0..1 (higher = darker); vectorised via cumulative filter
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += (1 - a) * (x[i] - acc); y[i] = acc
    return y

lp = onepole

# --- work_in: filtered noise whoosh with a low thump
n = int(1.1 * SR); tt = np.arange(n) / SR
noise = rng.standard_normal(n)
env = np.sin(np.pi * np.clip(tt / 1.1, 0, 1)) ** 2
sweep = np.empty(n); acc = 0.0
for i in range(n):
    a = 0.98 - 0.12 * env[i]
    acc += (1 - a) * (noise[i] - acc); sweep[i] = acc
write('work-in', sweep * env * 3 + np.sin(2 * np.pi * 55 * tt) * np.exp(-((tt - .45) * 9) ** 2) * .4)

# --- wipe (statement curtain): airy rise, then a soft bell at 0.95 s
n = int(1.8 * SR); tt = np.arange(n) / SR
noise = rng.standard_normal(n)
env = np.clip(tt / 1.2, 0, 1) ** 2 * np.exp(-np.clip(tt - 1.2, 0, None) * 6)
hi = noise - lp(noise, 0.9)
shift = int(0.95 * SR); tb = np.arange(n - shift) / SR
bell = np.zeros(n)
bell[shift:] = sum(np.sin(2 * np.pi * f * tb) * np.exp(-tb * dcy) * a for f, dcy, a in [(1174.66, 2.5, .25), (1760, 3.5, .14), (2349.3, 5, .07)])
write('wipe', hi * env * .5 + bell)

# --- tick: one key of a quiet mechanical keyboard
n = int(0.045 * SR); tt = np.arange(n) / SR
click = rng.standard_normal(n) * np.exp(-tt * 260) + np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 180) * .5
tick = click - lp(click, 0.6) * .5
tick *= np.clip((n - np.arange(n)) / (0.006 * SR), 0, 1)  # fade the tail so it never clicks
write('tick', tick)
print('ok')
