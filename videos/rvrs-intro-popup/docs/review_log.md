# Review log

Every check is made from the rendered MP4s (`python3 scripts/review.py <round>`) plus the per-beat contact sheets
(`node scripts/render.mjs --sheet`). Nothing is judged from the page. Critic prompt: the skill's `reference/CRITIQUE.md`.

Scores 1–10. Ship only when EVERY score is ≥ 8, after at least 3 rounds.

---

## Round 1: draft_9x16.mp4 (5.0 s, 30 fps, logo-only cut: no wordmark, no tagline)

| Criterion | Score | Evidence (timestamps, frames, metrics) |
|---|---|---|
| Hook (first 2 s) | 6 | Frame 0 is not blank: a white dot sits dead-centre on orange (strip B f0-f5, identical size every frame). But the dot is static from f0 to ~0.55 s (f15/f16 unchanged), so the "pop" is a cut, not a move, and there is no promise on screen. The logo only begins to draw at ~1.0 s (contact 1.0 s shows a sliver) and reads at ~1.5 s. Only a dot for the first 0.6 s does not stop a scroll. |
| Readability at phone size | 7 | No text, so the logo is the must-read. It reads fine at 360 px (phone_9x16 at 3 s and 4 s). Cap: key content in 9:16 UI zones. safe_9x16 shows the cap brim and head crossing into the right-hand rail zone from 3.2 s on, and past the frame edge. |
| Motion quality | 6 | Dot to card (strip_fast2, f15-f26, 0.5-0.87 s) is a clean grow-out-of-dot arc with shadow. Weaknesses: no overshoot or settle on the card landing (f23-f26 just ease to rest); no visible motion blur on the card expand (strip_fast f90-f96, 3.0-3.2 s); card lands as a flat slab. The ring pulse (b4, 2.5 s) and the b6 ring are not visible in contact.jpg at 2.5 s or 4.0 s. An orange ring on an orange field is invisible (same single accent), and at 3.75+ the field is white with nothing happening. 3.2-5.0 s the picture is near-dead (the 1.00 to 1.05 push is imperceptible: f144 to f149 look identical). |
| Variety / pacing | 6 | metrics: max_gap 1.23 s from 3.77, longest_static 1.07 s from 3.9 (within limits, so no cap). But all of 3.2-5.0 s is one shot at one scale: the build does not accelerate into the logo; it peaks at the 3.0 s cover and then idles for 1.8 s. Only 3 shot types (dot, card, full-white logo), every transition is the same grow/scale family. The b4 and b6 hits have no visible picture. |
| Brand accuracy | 7 | Real logo PNG, real orange (#F15A24 renders ~#EC5921 after the shadow/encode, close), one accent, no invented UI, no font to get wrong (logo-only). Held back: at 1.25x the logo is wider than the frame and the cap brim is clipped at the right edge (strip_fast f96-f101 and phone 3 s/4 s). The brand mark is cropped, and it is off-centre because the art is asymmetric. |
| Sound sync | 7 | metrics.sync: hits_within_45ms 4/5, mean abs 26.6 ms. Loudness -14.1 LUFS and peak -1.3 dBFS are in spec. Off-target: the 3.4375 s pop ("RVRS wordmark rises") is -67 ms and, more importantly, has no picture at all since the wordmark was dropped, so it is an orphaned hit. The 3.75 s "final lock-up thump" also lands on a frame where nothing changes visually (static from 3.9 s), and the planned ring pulse is not there to carry it. No hit exceeds 80 ms, so no cap. |
| Composition (every format) | 6 | 9:16 only. Card phase: the card sits centred in the upper-middle, bottom ~30 % of the frame empty orange. End phase (3.2-5.0 s): logo band occupies about 27-66 % of height, with ~34 % empty white below and ~27 % above, and it is a landscape illustration in a portrait frame, wider than the frame. Depth: the soft card shadow gives some separation, but once the card goes full-screen the logo is a flat sticker on white. Not a third empty for more than 1 s at a time, so no hard cap, but the logo placement is the main compositional failure. |
| Polish | 5 | near_blank_frames: none. loop_seam_jump 118.9 (hard-cut range is 40-80, so this is harsher than a normal cut): loop_seam.jpg goes from a full white logo frame (f149) to an orange dot frame (B f0) with no bridge. Logo clipped at the right edge from 3.2 s to the end. Sliver of the logo cord on the sweep at 1.0 s (contact) is acceptable as the intended mask draw, but the brim clipping is not. Orphan audio cue at 3.4375 s. Missing b4/b6 ring pulses make the film look unfinished. |

**3 worst problems** (ranked by damage to the film)
1. 3.1-5.0 s: the logo overflows the frame. After the card expands, the logo is scaled to ~1.25x of a ~700-880 px width and is clipped at the right edge (cap brim cut at x=1080), and it sits in the right-hand UI zone in safe_9x16. This is the final hero frame and it is the held frame for 1.8 s, so the film ends on a cropped logo.
2. 2.5 s and 3.75 s: the b4 and b6 hits have no visible event. The orange ring is the same colour as the orange background, so the b4 ring pulse is invisible, and the b6 ring pulse from the approved shotlist (end shot) is absent from the 4.0 s still. The audio has a pop at 3.4375 s and a thump at 3.75 s with nothing on screen. The last 1.8 s is a static logo with a ~1.2 s dead stretch (3.77-5.0 s gap).
3. Loop seam and dead hook: f149 (white, full logo) to f0 (orange, small dot) is a 118.9-jump hard cut, and the dot is motionless for 0.55 s at the start, so the opening and the closing both read as stills.

**Fixes for round 2** (one per problem)
1. Re-block the end phase for 1080x1920: cap the logo at ~820 px wide (scale 1.0-1.1 instead of 1.25), centre it on its visual bounding box (not the PNG box) at about 42-45 % height, keep the brim at least 70 px inside the right edge and out of the right ~120 px rail. Add a subtle shadow or card-less depth cue if wanted. Verify: safe_9x16 at 3.2, 4.0 and 4.9 s shows no ink outside the safe rectangle, and a still at --at 4.9 shows full cap brim.
2. Make the pulses visible: draw the b4 ring as a white stroke (or a ring of #FFFFFF over the orange, 12-20 px, fading by scale, no alpha fade as a transition) expanding past the card, and the b6 ring as an orange ring on the white screen expanding past the edges, timed so the ring is at ~60 % scale at the hit. Remove or move the 3.4375 s pop so every cue has a picture. Add a gentle continuous logo push (1.00 to 1.06 with visible easing) plus a small logo lift on the b6 thump. Verify: contact/strip stills at 2.5 s and 3.75-4.0 s show a ring, and max_gap_between_visual_events stays under 1.0 s.
3. Fix the seam and the hook: make the dot scale from 0 to 160 px (or with a real overshoot) in the first 6-8 frames so frame 0 reads as an orange screen with a pop in progress, not an idle dot, and end the film with a move that returns to the opening state (e.g. the b6 ring flooding the screen orange, or a card shrink-to-dot after the last hit) so loop_seam_jump falls below ~40. Verify: loop_seam.jpg shows a continuous handoff and metrics.loop_seam_jump < 40.

Also: add motion blur to the 3.0-3.2 s card expand and give the card landing a visible overshoot, so the strips show weight rather than linear eases.

**Verdict:** ANOTHER ROUND

---

## Round 2: draft_9x16.mp4 (5.0 s, 30 fps, logo-only intro; review/r2)

Round 1 check: (1) logo overflow FIXED (brim now inside the frame, no clipping at 3.0-4.9 s), but the brim tip still touches the right edge of the safe rectangle in safe_9x16 at 3 s and 4 s. (2) ring pulses: b6 orange ring now clearly visible (strip_fast2 f113-f119), b4 white ring NOT visible in contact at 2.5 s (card just kicks larger, no ring) and no strip covers it, so unverified; 3.4375 s pop removed. (3) hook/seam: dot now overshoots (strip B f0 small circle, f1-f3 larger squircle), but loop_seam_jump rose 118.9 to 124.2, and 3.77-5.0 s is still a dead hold.

| Criterion | Score | Evidence (timestamps, frame numbers, metric values) |
|---|---|---|
| Hook (first 2 s) | 6 | f0 is a ~50 px white dot on a full orange field (strip B f0), near-blank. The overshoot (f0 to f3) is a real improvement over r1, but the logo only starts at ~1.0 s (sliver in contact) and reads at ~1.4 s. Nothing at 0-0.6 s says what the product is. |
| Readability at phone size | 7 | Logo reads clearly in phone_9x16 at 3 s and 4 s. Cap stays 7: safe_9x16 at 3 s/4 s shows the brim tip at the right edge of the safe rectangle (x~972 vs ~966), no margin. |
| Motion quality | 6 | Ring at 3.75 s is clean and visible, but it pops in: f112 (3.733 s) has no ring, f113 (3.767 s) already shows a ~270 px-diameter ring, so no growth from zero (cap 7). Card-to-cover (strip_fast f91-f96, 3.03-3.2 s) is a clean ~6-frame ease with no overshoot and no visible motion blur (still unfixed from r1). b4 white ring not visible at 2.5 s. Logo kick at b6 is barely perceptible (f111 vs f114 almost identical). |
| Variety / pacing | 7 | metrics: max_gap 1.23 s from 3.77, longest_static 0.83 s from 1.6, near_blank none. Events at 0.5, 1.25, 2.5, 3.1, 3.75 s, so spacing is fine, but the build does not accelerate (gaps 0.75, 1.25, 1.25, 0.6, 0.65) and 3.77-5.0 s is a still logo hold. Only one shot scale. |
| Brand accuracy | 8 | Real logo PNG, single accent orange (~#EC5921 after encode), no invented UI, no text. Logo no longer cropped (fixed). Ring colour matches the field. |
| Sound sync | 8 | hits_within_45ms 4/4, mean abs 16.5 ms (max 33 ms), LUFS -14.1, peak -1.3 dBFS, all in spec. Orphan pop removed. The b4 pop has no confirmed picture (white ring not seen in contact). Cue text mentions a "glow flash", which is a banned look; none is visible. |
| Composition (every format) | 6 | 9:16 only. Card phase 0.6-3.0 s (2.4 s): card spans ~28-65 % of height, bottom ~35 % of frame empty orange (contact 1.0-2.5 s). End phase: logo band ~28-60 %, about 28 % empty above and 40 % empty below, logo reads as a landscape sticker on white with no depth. Better centred than r1, still not re-blocked for portrait. |
| Polish | 6 | No blank frames. loop_seam_jump 124.2 (worse than r1 118.9): loop_seam.jpg goes from white full logo (A f149) to a small dot on orange (B f0) with no bridge. Ring pop-in at f113. Brim tip against the safe edge. Seam only lightly weighted for an app-launch intro. |

**3 worst problems** (ranked by damage to the film)
1. 3.77-5.0 s and 0-0.6 s: both ends are near-dead. The film ends on a 1.23 s still logo after the ring, and opens on a 50 px dot, so the hook promises nothing and the last beat is wasted. Seam 124.2 confirms the end and start are unrelated stills.
2. 0.6-3.0 s and 3.2-5.0 s: portrait composition. The logo/card is a landscape block in the middle of a 9:16 frame with 35-40 % of the frame empty below it, and it is a flat sticker on white after the cover.
3. Motion weight: ring pops in at 3.767 s (no ring at f112, big ring at f113), card/cover has no overshoot or blur (f91-f96), the b6 logo kick is imperceptible, and the b4 white ring is not visible at 2.5 s.

**Fixes for round 3** (one per problem)
1. Hook and ending: make the dot start at 0 and overshoot to ~180 px by f4 with a visible squash, and give the orange field a move at f0 (e.g. the dot spawning from a ring that is already expanding). Fill 3.8-5.0 s with one more visible event: a slow 1.00 to 1.06 logo push plus a final lift/settle at ~4.4 s, or a ring/card shrink back toward a dot at 4.7-5.0 s so the end approaches the opening state (target loop_seam_jump < 60). Verify: metrics max_gap < 0.9 s, seam lower, strip B f0-f5 shows growth from near 0.
2. Composition: enlarge the card to ~86 % of the width and centre card and final logo at ~45 % height (visual centre of mass), add a soft shadow/ground cue under the logo on white, and scale the logo to ~900 px wide so top and bottom empty bands fall under ~30 %. Keep the brim at least 70 px inside the right edge. Verify: safe_9x16 shows ink inside the safe rectangle at 3, 4, 4.9 s; empty bottom band < 30 %.
3. Motion: start the 3.75 s ring at radius ~20 px at f112 so it grows from the logo (f112 shows a small ring); add 2-3 frames of directional blur or a stretch on the card cover (f91-f96) and a 3-4 % overshoot on the card landing at 1.25 s; make the b6 logo kick 1.00 to 1.05 and back over 6 frames; make the b4 white ring visible by ~10 % of card width. Verify with a strip of 12 frames from 2.45 s (ring present and growing) and a second strip from 3.7 s.

**Verdict:** ANOTHER ROUND

---

## Round 3: draft_9x16.mp4 (5.0 s, 30 fps, logo-only one-shot intro; review/r3)

Round 2 check: (1) dead ends: dot now starts bigger (~165 px at B f0, squircle by f2), but max_gap is still 1.1 s (from 1.43) and the 3.9-5.0 s hold is near-identical (A f144-f149 differ by a few px; a 1.00 to 1.09 push is hardly readable). Seam 123.7 (r2 124.2), unchanged. (2) composition: card now 930 px wide and fills the width, logo ~826 px, but a landscape block still sits in the upper 62 % with ~38 % empty below it (contact 3.0-4.5 s, strip A). (3) motion: b4 white ring now VISIBLE (still t2.550: white ring ~1100 px across, brim of card kicked); b6 ring still pops in (strip_fast2 f112 no ring, f113 ~410 px ring, then grows, so the "start at 60 px" is not visible); card cover f91-f96 still has no blur or overshoot; b6 logo kick 1.00 to 1.08 is small but now perceptible (f111 vs f114 logo grows).

| Criterion | Score | Evidence (timestamps, frame numbers, metric values) |
|---|---|---|
| Hook (first 2 s) | 6 | B f0 is a ~165 px white dot on a full orange field, ~97 % empty; f1-f2 squircle overshoot is good. But nothing says "RVRS" until the logo starts drawing at ~1.0 s (contact 1.0 s sliver) and reads at ~1.5 s. 0.5 s is an empty white rounded rect (contact 0.5 s) with no content. Frame 0 near-blank cap (6). |
| Readability at phone size | 7 | Logo reads clearly at 360 px (phone 1-4 s). safe_9x16 at 3 s and 4 s: brim tip still touches the right edge of the safe rectangle (x~968 vs ~966), so key content in the rail zone, cap 7. |
| Motion quality | 7 | Improved: b4 white ring present, dot overshoot, b6 kick visible, ring grows with a clean arc f114-f118 (strip_fast2). Still: ring pops in between f112 and f113 (no growth from near zero), cap 7. Card to cover (strip_fast f91-f96, 3.03-3.2 s) is a 5-frame linear-ish ease with no motion blur and no overshoot on landing. Card at 1.25 s lands without settle. |
| Variety / pacing | 7 | metrics: max_gap 1.1 s from 1.43, longest_static 0.8 s from 1.63, no blank frames. Events at 0.5, 1.25, 2.5, 3.1, 3.75: gaps 0.75, 1.25, 0.6, 0.65 then 1.25 s of hold to the end; the build does not accelerate, it decelerates into a 1.2 s idle logo. One shot scale only. |
| Brand accuracy | 8 | Real logo art, single accent orange, no text, no invented UI, no cropping (brim inside frame). White ring and orange ring use the same palette. |
| Sound sync | 8 | hits_within_45ms 4/4, mean abs 8.2 ms, max 33 ms, -14.1 LUFS, -1.3 dBFS peak (in spec). b4 pop now has a picture (white ring). Cue text still says "glow flash" (no glow on screen, fine). |
| Composition (every format) | 6 | 9:16 only. Card phase (0.6-3.0 s): card ~420-1300 px of 1920, ~32 % empty below, ~22 % above. End phase 3.2-5.0 s (1.8 s): logo band ~27-62 % of height, ~38 % empty below and ~27 % above, a landscape illustration floating on flat white, no shadow or depth. Over a third empty for > 1 s, cap 7, and a flat sticker on white, so 6. |
| Polish | 6 | No blank frames. Seam jump 123.7 (loop lightly weighted for a one-shot, but the last 1.2 s is a dead hold, not a seam issue). Ring pop-in at f113. Brim tip at the safe edge. Hook blank-ish rect at 0.5 s. |

**3 worst problems** (ranked by damage to the film)
1. 3.9-5.0 s (and 1.43-2.5 s): idle holds. After the b6 ring leaves at ~4.0 s the final 1.0 s is a still logo (A f144-f149 nearly identical, the 1.09 push is below perception), and the card hold 1.43-2.5 s only has a tiny logo draw. max_gap 1.1 s, longest_static 0.8 s.
2. 3.2-5.0 s composition: the logo is a landscape sticker in the upper 62 % of a portrait frame on flat white, with ~38 % empty below and no depth cue; the end hero frame is the weakest frame of the film.
3. Motion weight: b6 ring pops in at f113 (no growth from zero), card cover f91-f96 has no blur or overshoot, and the brim tip still sits on the safe-zone edge.

**Fixes for round 4** (one per problem)
1. Make the ending move: raise the end push to 1.00 to 1.15 with an ease-out over 3.2-5.0 s (and a visible 4.4 s settle), or add a second ring/ripple at ~4.4 s; add a visible logo-stroke action inside the card hold at ~1.9 s (a small lift or a stroke shimmer in orange only). Verify: metrics max_gap < 0.9 s, longest_static < 0.6 s, and A f144 vs f149 differ by > 6 % in logo width.
2. Re-block the end for portrait: move the logo centre to ~46 % height, add a soft ground shadow ellipse under the logo and a faint orange ground-band or second smaller element so the bottom empty band is under 30 %, or scale logo to ~900 px wide with brim >= 70 px inside the right edge (safe_9x16 ink inside the rectangle at 3, 4, 4.9 s). Verify: strip A shows ink spanning 24-68 % of height, safe_9x16 brim tip left of the safe edge.
3. Motion weight: start the b6 ring at 60 px on f112 (hit frame) with ease-out so f112 shows a small ring and f113 a ~150 px ring; add 2-3 frame directional stretch/blur on the card cover f91-f96 and a 3-4 % overshoot at 1.25 s. Verify: strip_fast2 f112 has a visible ring below ~120 px; strip_fast f93-f95 show smearing and f96 a slight overshoot.

**Verdict:** ANOTHER ROUND

---

## Round 4: draft_9x16.mp4 (5.0 s, 30 fps, logo-only one-shot intro; review/r4; draft has no motion blur, not penalised)

Round 3 check: (1) end push: 3 s to 4 s logo grows ~194 to ~206 px in phone_9x16 (about 6 %), so a push exists, but A f144 vs f149 are identical (logo 277 px wide in both): the ease-out has finished by ~4.3 s, and the 1.04-to-1.15 target is not visible. longest_static 0.63 s from 4.33 (was 0.8), max_gap 1.13 s from 1.33 (was 1.1 from 1.43): unchanged. (2) End re-block LANDED: logo ink spans ~29-68 % of height with an orange ground shadow, empty bands ~29 % top / ~32 % bottom. Brim is now WORSE vs the safe zone: at 4 s it sits ~50 px past the right edge of the safe rectangle (3 s: ~15 px). (3) Motion: b4 ring now starts inside the card and grows (strip_fast2 f78-f84), but it is drawn over the logo and leaves white arcs cutting the logo strokes at f77-f78. Card cover f91-f96 is a clean 6-frame arc, no overshoot visible (landing overshoot not visible in any strip). b6 ring: NOT visible in contact at 4.0 s and no strip covers 3.75 s, so unverified; it cannot be credited.

| Criterion | Score | Evidence (timestamps, frame numbers, metric values) |
|---|---|---|
| Hook (first 2 s) | 6 | B f0 is a ~165 px white dot on a ~97 % empty orange field (near-blank cap). f1-f3 squircle overshoot is good. 0.5 s is an empty white rect, the logo only starts drawing at ~1.0 s (sliver) and reads at ~1.5 s. Unchanged from r3. |
| Readability at phone size | 7 | Logo reads clearly at 360 px (phone 1-4 s). safe_9x16: brim tip crosses the right safe edge at 3 s and more at 4 s (red sliver outside the white safe rect, ~50 px). Key content in a UI zone, cap 7. |
| Motion quality | 7 | Good: dot squircle overshoot, card-to-cover clean arc (f91-f96), ring grows from inside the card. Faults: ring pops in at ~280 px between f76 and f77 (no tiny ring), white ring arcs slice across the logo at f77-f78 (z-order glitch), no visible landing overshoot or settle, b6 ring and kick unverified. Pop/glitch cap 7. |
| Variety / pacing | 7 | max_gap 1.13 s (from 1.33), longest_static 0.63 s (from 4.33), no blank frames. Events at 0.5, 1.0-1.5 (logo draw), 2.5, 3.1, 3.75. The build decelerates: 1.33-2.4 s is a still card, the last 0.6 s is a still logo. One shot scale. |
| Brand accuracy | 8 | Real logo art, single accent orange (~#EC5921), white ring in the same palette, no text or invented UI, no cropping. |
| Sound sync | 8 | hits_within_45ms 4/4, mean abs 8.2 ms, LUFS -14.1, peak -1.3 dBFS. b6 thump (3.75 s) has no confirmed picture in the r4 stills. Cue text "glow flash" has no glow on screen. |
| Composition (every format) | 7 | 9:16 only. End frame improved (logo centre ~46 %, ground shadow, ~29/32 % empty bands). Card phase 0.6-3.0 s (2.4 s) is unchanged: card spans ~23-66 %, ~34 % empty orange below. Still a landscape block in a portrait frame, no re-blocked layout, so 7 not 8. |
| Polish | 6 | No blank frames. White ring arcs over the logo at 2.53-2.57 s. Brim past the safe edge. Orphan-ish b6 hit. Seam 122.2 (ignored for a one-shot). Dead-ish hold 1.33-2.4 s. |

**3 worst problems** (ranked by damage to the film)
1. 0-1.5 s: hook. A 165 px dot, then an empty white rect (0.5 s), then a logo sliver at 1.0 s; nothing recognisable until ~1.5 s, and the card then sits still 1.33-2.4 s (max_gap 1.13 s).
2. 3.0-5.0 s: end hero frame. Brim crosses the safe-zone right edge (~50 px at 4 s) and the push is finished by ~4.3 s (A f144 = f149), so the last 0.6 s is dead; the b6 ring is not visible anywhere in the stills.
3. 2.5-2.6 s: b4 ring is drawn over the logo (white arcs across strokes at f77-f78) and appears at ~280 px with no growth from zero; card landing has no visible overshoot.

**Fixes for round 5** (one per problem)
1. Start the logo stroke-draw at ~0.55 s while the card is still expanding (logo mask reveal begins at 0.6, fully drawn by 1.2 s), start the dot at 0 px growing to 165 px with a squash over f0-f3, and add a 1.5-1.9 s event (card tilt/lift 1.00 to 1.05 with orange stroke shimmer). Verify: contact 0.5 s shows ink, metrics max_gap < 0.9 s.
2. Shift the end logo ~60 px left (centre on the safe rect, brim >= 20 px inside x=948 at its largest scale; or cap end scale at ~0.88), and retime the ease so motion is still visible at 4.6 s (ease-in-out across 3.2-4.9 s, or a 4.4 s settle kick). Make the b6 ring visible at 3.75-4.0 s (orange ring on white, starting 60 px, scrolled past the logo). Verify: safe_9x16 at 4 s shows no ink outside the safe rect, strip from 3.7 s shows the ring, A f144 vs f149 logo widths differ > 3 %.
3. Put the b4 ring below the card/logo in z-order (or clip it to outside the card), begin it at <= 100 px radius on the hit frame, and add a 3 to 5 % overshoot on the 1.25 s landing. Verify: strip from 2.45 s shows a small ring growing with no white on the logo; strip from 1.1 s shows the overshoot.

**Verdict:** ANOTHER ROUND

---

## Round 5: draft_9x16.mp4 (5.0 s, 30 fps, logo-only one-shot intro; review/r5; draft has no motion blur, not penalised; loop seam ignored)

Round 4 check: (1) hook: logo draw now starts while the card lands: contact 0.5 s shows a logo sliver inside the card and 1.0 s shows the full logo (LANDED). But max_gap got worse, 1.3 s from 1.17 (r4: 1.13 from 1.33), because the draw now finishes early and the card then sits 1.0-2.5 s with only a ~3 % push (card 168 to 174 px wide across 1-2 s in the contact sheet). (2) end hero: brim now INSIDE the safe rect (safe_9x16 at 3 s and 4 s: ink tip ~3 display px, about 13 px real, inside the white rect; LANDED). b6 ring now VISIBLE and grows (strip_fast2 f113 tiny ~30 px ring, f114 ~60, f122 past the frame; LANDED). End push NOT perceptible: A f144 logo spans x 45-290 (245), A f149 spans 40-286 (246), so the 1.04 to 1.13 linear push is not visible; phone 3 s vs 4 s logo 173 vs 177 px (~2 %). longest_static 0.67 s from 4.3 (r4 0.63, unchanged). (3) b4 ring z-order LANDED: contact 2.5 s shows the white ring behind the card, no white on the logo; strip_fast f84-f87 ring leaves cleanly. The ring start size is not covered by a strip (strip starts 2.8 s), so "starts at 400 px" is unverified beyond the contact still. Landing overshoot at 1.25 s still not visible in contact/strips.

| Criterion | Score | Evidence (timestamps, frame numbers, metric values) |
|---|---|---|
| Hook (first 2 s) | 6 | B f0 is a ~165 px white dot on a ~97 % empty orange field (near-blank cap 6). f1-f3 squircle overshoot reads well. Better than r4: 0.5 s now has ink (logo sliver in the card) and 1.0 s is a full logo, so the promise lands by ~1.0 s. Still, frames 0-0.5 s are a dot and an empty-ish rect, and the card hold from 1.0 s does nothing new. |
| Readability at phone size | 8 | No text; logo reads clearly at 360 px (phone 1-4 s). safe_9x16 at 3 s and 4 s: all ink inside the safe rect (brim tip ~13 px inside the right edge; tight but compliant). Top/bottom zones clear (end logo 29-68 % height). |
| Motion quality | 7 | Good: dot squircle overshoot, clean 6-frame card-to-cover arc (f90-f95), b4 ring now travels under the card, b6 ring grows from ~30 px with a clean arc (f113-f122). Faults: the b6 ring still first appears one frame after the hit (f112 none, f113 tiny); no visible overshoot or settle on the card landing at 1.25 s; the end push (A f144 = f149) is not perceptible, so the final hero has no follow-through. Landing weight missing, cap 7. |
| Variety / pacing | 7 | metrics: max_gap 1.3 s from 1.17 (worse than r4 1.13), longest_static 0.67 s from 4.3, no blank frames. Events: 0.5 card, 0.6-1.0 draw, 2.5 ring, 3.1 cover, 3.75 ring. The build still decelerates: 1.0-2.5 s is a near-still card (only a 1.00-1.03 push) and the last 0.7 s is still. One shot scale only. A problem noted last round (end dead, card hold) is still visible, so no rise. |
| Brand accuracy | 8 | Real logo art, single accent orange (~#EC5921 after encode), white ring and orange ring from the same palette, no text, no invented UI, no cropping. |
| Sound sync | 8 | hits_within_45ms 4/4, mean abs 8.2 ms, LUFS -14.1, peak -1.3 dBFS. b4 pop has a picture (ring) and the b6 thump has a picture (ring at f113, +33 ms). Cue text still says "glow flash" (none on screen, fine). |
| Composition (every format) | 7 | 9:16 only. End frame good (logo ~29-68 % height, ground shadow, ~29/32 % empty bands, safe-zone clean). Card phase 1.0-3.0 s (2 s): card ~27-67 %, ~33 % empty orange below and ~27 % above, a landscape block centred in a portrait frame; unchanged. Cap 7. |
| Polish | 7 | No blank frames, no ring on logo, no clipping, brim inside the safe rect. Remaining: 1.0-2.5 s dead-ish hold, b6 ring starts one frame late, motionless final 0.7 s. Seam 124.3 ignored for a one-shot. |

**3 worst problems** (ranked by damage to the film)
1. 1.0-2.5 s (max_gap 1.3 s from 1.17): the logo is fully drawn by 1.0 s and the card then just sits with a ~3 % push. The film's weakest stretch, and it is right after the hook.
2. 4.3-5.0 s (longest_static 0.67 s): the end push is imperceptible (A f144 logo 245 px vs f149 246 px). The final hero frame has no follow-through, so the film ends on a still.
3. Hook and landing weight, 0-0.6 s and 1.25 s: frame 0 is a small dot on ~97 % orange (cap 6), and the card lands with no visible overshoot or settle, so the open and the first landing feel light.

**Fixes for round 6** (one per problem)
1. Give 1.0-2.5 s a real event: delay the logo draw to finish at ~1.6 s (start 0.8 s) or add a second beat at ~1.9 s (a one-time card tilt/lift 1.00 to 1.06 with a 6-frame spring settle, or an orange stroke shimmer along the logo). Verify: metrics max_gap < 0.9 s and contact 1.5 s vs 2.0 s show a visible size or position change (> 4 %).
2. Make the ending push readable: change the logo scale to a clear 1.00 to 1.12 over 3.3-5.0 s (ease-in-out so it is still moving at 4.9 s), or add a 4.5 s kick (1.00 to 1.06 and settle) while keeping the brim >= 15 px inside x=948 (check safe_9x16 at 4.9 s). Verify: A f144 vs f149 logo widths differ > 4 %, longest_static < 0.5 s.
3. Start the dot at ~60 px (f0) and overshoot to ~190 px by f3 so frame 0 is already mid-pop, put a 3-5 % overshoot with a 6-8 frame spring on the 1.25 s card landing, and start the b6 ring at 60 px ON f112. Verify: strip B f0-f5 shows growth from ~60 px, a strip from 1.1 s shows the overshoot, strip_fast2 f112 shows a ring.

**Verdict:** ANOTHER ROUND
