# Style guide: RVRS app intro (5 s, 9:16)

Source: `assets/brand/logo.png` (orange embroidered-cord illustration, glow baked into alpha), `app.json` (splash/notification orange #F15A24). No reference film.

## 1. Palette
| Token | Hex | Source |
|---|---|---|
| `--bg` | #F15A24 | app.json notification/brand orange (the ONE accent) |
| `--card` | #FFFFFF | popup card, so the orange logo reads |
| `--ink` | #1A0F0A | wordmark on the white end card |
| `--accent` | #F15A24 | same orange: dot, ring pulse, wordmark highlight |
Logo orange is measured from the PNG in build; the logo keeps its own glow, nothing else glows.

## 2. Type
Wordmark "RVRS" only, one bold grotesque (no brand font supplied; placeholder until the user gives one). Sentence/upper per brand: all caps, tight tracking. 220 px+ at 1080 wide.

## 3. Rhythm
96 BPM, beat = 0.625 s, bar = 2.5 s. Hits on beats 0, 1, 2, 4, 5, 5.5, 6. Something new every 0.6-1.9 s; end card holds 1.9 s and keeps moving.

## 4. Transitions
Grow-out-of-something (dot to card), card expand to cover (hard land on beat 5), mask rise for the wordmark. No crossfades.

## 5. Camera
Micro push 1.00 to 1.05 across the held card and the end card.

## 6. Texture
Clean digital. Soft card shadow for depth. Only the logo's baked glow.

## 7. Text in / out
Wordmark rises through a mask (starts 140%+ below). No exit; film ends on the lock-up.

## 8. Sound
Synth 96 BPM Am to F; pop / whoosh / thump on the cues in timeline.json. No VO.
