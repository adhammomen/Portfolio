# Synthesizes the site sound: one ambient loop and three short effects, as 16-bit WAVs.
# Usage: python3 scripts/gen-sound.py <outdir>, then encode to assets/sound/*.mp3 with ffmpeg (libmp3lame, 160k ambient, 128k effects).
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

t_len = 32.0
N = int(SR * (t_len + 4))
t = np.arange(N) / SR
mid = lambda m: 440 * 2 ** ((m - 69) / 12)

# --- ambient loop: two slow chords (Dsus2 → Bbmaj7(#11) colour), detuned sine/triangle pads, air, a quiet heartbeat
chords = [[38, 45, 52, 57, 64], [34, 41, 50, 57, 62]]
pad = np.zeros(N)
for ci, ch in enumerate(chords):
    # each chord lasts 16 s with raised-cosine crossfades, loops over 32 s
    phase = (t - ci * 16) % 32
    env = np.clip(np.minimum(phase / 4, (20 - phase) / 4), 0, 1) * (phase < 20)
    env = 0.5 - 0.5 * np.cos(np.pi * env)
    for k, m in enumerate(ch):
        f = mid(m)
        for det in (-0.07, 0.0, 0.06):
            ff = f * 2 ** (det / 12)
            lfo = 1 + 0.002 * np.sin(2 * np.pi * (0.05 + 0.01 * k) * t)
            pad += env * (0.6 if k < 2 else 0.35) * np.sin(2 * np.pi * ff * t * lfo + rng.random() * 6.28)
pad /= 12
# slow filter sweep by mixing a darker copy
air = rng.standard_normal(N) * 0.02
air = lp(air, 0.995)
air *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 16) ** 2
beat = np.zeros(N)
for s in np.arange(0, t_len + 4, 2.0):  # heartbeat every 2 s, like a status light
    i = int(s * SR); L = int(0.09 * SR)
    if i + L < N:
        tt = np.arange(L) / SR
        beat[i:i + L] += np.sin(2 * np.pi * 62 * tt) * np.exp(-tt * 38) * 0.35
bgm = pad + air * 6 + beat
# seamless: fold the last 4 s onto the start with an equal-power crossfade
L = int(4 * SR); body = bgm[:int(t_len * SR)].copy(); tail = bgm[int(t_len * SR):int(t_len * SR) + L]
fade = np.linspace(0, 1, L)
body[:L] = body[:L] * np.sqrt(fade) + tail * np.sqrt(1 - fade)
# gentle stereo width
d = int(0.011 * SR)
right = np.concatenate([body[-d:], body[:-d]])
write('ambient', np.stack([body, right * 0.97 + body * 0.03], 1))

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
