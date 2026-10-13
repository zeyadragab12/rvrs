# Shotlist: RVRS app intro · 5.0 s · 96 BPM · 8 beats · 9x16 (1080x1920)

STATUS: DRAFT — waiting for the user's OK. Nothing gets built until this says APPROVED.

| # | Beats | Time (s) | Shot | On-screen text | Motion (preset / transition) | SFX | VO | 9:16 notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 0-1 | 0.00-0.63 | Hook: orange screen, a white dot pops dead-centre on frame 0 | none | snappy pop 0 to 160 px, tiny squash-free overshoot | pop @b0 | none | centred, inside safe zone |
| 2 | 1-2 | 0.63-1.25 | Dot grows into a white rounded popup card, soft shadow | none | default spring, grow-out-of-dot, lands on b1 | whoosh @b1 | none | card 820x700, centred slightly above middle |
| 3 | 2-4 | 1.25-2.50 | Logo pops into the card: cord art draws on with a left-to-right mask sweep, scales 0.8 to 1 | none | heavy spring on logo, spHit leads b2 | thump @b2 | none | logo ~700 wide inside card; slow push 1.00 to 1.04 |
| 4 | 4-5 | 2.50-3.13 | Bar 2 downbeat: glow flash on the logo + orange ring pulse out of the card; card rises 6% | none | snappy ring, expands past screen edge | pop @b4 | none | ring stays centred |
| 5 | 5-6 | 3.13-3.75 | Card expands to cover the whole screen (white); logo grows to 1.25x and moves up slightly | none | default spring, card radius 60 to 0, lands on b5 | whoosh @b5 | none | logo stays out of top 14% / bottom 20% |
| 6 | 5.5-8 | 3.44-5.00 | End card: "RVRS" wordmark rises through a mask under the logo, then lock-up pushes 1.00 to 1.05 until the end; last orange underline wipes in on b6 | RVRS | TYPE.rise heavy; underline snappy | pop @b5.5, thump @b6 | none | wordmark ≥ 220 px, above bottom 20% |

## Music
Synth, Am then F, 96 BPM: intro groove bar 1, drop on the b4 downbeat (accents on logo b2 and b4). Mixed at -14 LUFS.

## Open questions for the user
- Wordmark: no brand font supplied. Send a font file, or I use a bold grotesque. Want the "RVRS" wordmark at all, or logo only?
- Optional tagline under the wordmark (default: none).
- The logo's glow is baked into the PNG; on white it will read as a soft orange halo. OK, or do you have a no-glow version?
- Output is an MP4 for preview. For the app, I can also export it as a short loop for expo-video or Lottie-style frames. Tell me which you want.
