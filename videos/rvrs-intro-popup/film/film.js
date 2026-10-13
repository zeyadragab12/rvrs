// RVRS app intro, 5 s, 9:16. Orange screen: a white dot pops, the logo draws itself in white, an orange ball hits it on the bar line,
// the logo turns orange while a white flood expands from the hit, then an orange ring + push-in end card.
// Pure function of time. Marks in timeline.json: dot 0, draw 1, ball 3, pulse 4 (hit), cover 5, end 6, done 8.
(() => {
  const { W, H, put, reg, el, scene, seg, clamp, lerp, ease, bt, beatOf } = C;
  C.fonts = [];
  const CX = W / 2, CY = 860;
  const LW = 1100, LH = Math.round(1100 * 1250 / 1700);          // padded logo canvas box (glow margin included)
  const LS = 0.84;                                               // logo scale: brim stays inside the right safe edge at the final push
  const LX = CX - LW / 2 - 24;                                   // art sits slightly right of the box centre
  const HIT = [CX - 20, CY - 20];                                // where the ball lands (centre of the artwork)

  function drawLogo(S, prog, fin, mix) {
    const m = S.mask.getContext('2d'), tt = S.tmp.getContext('2d'), g = S.logo.getContext('2d');
    m.clearRect(0, 0, 1700, 1250); m.strokeStyle = '#fff'; m.lineWidth = 72; m.lineCap = 'round'; m.lineJoin = 'round';
    let left = prog * S.tot;
    m.beginPath();
    for (let i = 0; i < LOGO_PATHS.length && left > 0; i++) {
      const p = LOGO_PATHS[i], c = S.seg[i], len = c[c.length - 1];
      m.moveTo(p[0][0], p[0][1]);
      for (let j = 1; j < p.length; j++) {
        if (left >= c[j]) { m.lineTo(p[j][0], p[j][1]); continue; }
        const f = (left - c[j - 1]) / (c[j] - c[j - 1]);
        m.lineTo(p[j - 1][0] + (p[j][0] - p[j - 1][0]) * f, p[j - 1][1] + (p[j][1] - p[j - 1][1]) * f);
        break;
      }
      left -= len;
    }
    m.stroke();
    // tmp = the real logo texture, revealed by the stroke mask (then fully filled in over the last 14% of the draw)
    tt.globalCompositeOperation = 'source-over'; tt.globalAlpha = 1; tt.clearRect(0, 0, 1700, 1250);
    tt.drawImage(S.src, 0, 0, 1700, 1250);
    tt.globalCompositeOperation = 'destination-in'; tt.drawImage(S.mask, 0, 0);
    if (fin > 0.001) { tt.globalCompositeOperation = 'source-over'; tt.globalAlpha = fin; tt.drawImage(S.src, 0, 0, 1700, 1250); tt.globalAlpha = 1; }
    // final = white silhouette, with the orange logo mixed over it by `mix`
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, 1700, 1250);
    g.drawImage(S.tmp, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, 1700, 1250);
    g.globalCompositeOperation = 'source-over';
    if (mix > 0.001) { g.globalAlpha = mix; g.drawImage(S.tmp, 0, 0); g.globalAlpha = 1; }
  }

  scene({
    name: 'intro', from: 'dot', to: 'done',
    build(root, S) {
      root.style.background = 'var(--bg)';
      S.cam = el('div', { class: 'abs', style: `width:${W}px;height:${H}px;transform-origin:50% 50%` }, root); reg(S.cam);
      S.flood = el('div', { class: 'abs', style: 'border-radius:50%;background:#fff' }, S.cam); reg(S.flood, { o: 0 });
      S.dot = el('div', { class: 'abs', style: 'width:170px;height:170px;border-radius:50%;background:#fff;box-shadow:0 20px 50px -12px rgba(0,0,0,.3)' }, S.cam); reg(S.dot, { o: 0 });
      S.shadow = el('div', { class: 'abs', style: 'width:620px;height:70px;border-radius:50%;background:rgba(241,90,36,.22);filter:blur(26px)' }, S.cam); reg(S.shadow, { o: 0 });
      S.src = el('img', { src: '../assets/brand/logo_pad.png', style: 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none' }, root);   // preloaded by READY; drawn into the canvases
      S.logo = el('canvas', { class: 'abs', width: 1700, height: 1250, style: `width:${LW}px;height:${LH}px;transform-origin:50% 50%` }, S.cam); reg(S.logo, { o: 0 });
      S.mask = document.createElement('canvas'); S.mask.width = 1700; S.mask.height = 1250;
      S.tmp = document.createElement('canvas'); S.tmp.width = 1700; S.tmp.height = 1250;
      S.seg = LOGO_PATHS.map((p) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; });
      S.tot = S.seg.reduce((a, c) => a + c[c.length - 1], 0);
      S.trail = [0, 1, 2, 3].map(() => reg(el('div', { class: 'abs', style: 'width:140px;height:140px;border-radius:50%;background:#C43E0C;border:16px solid #fff;box-shadow:0 14px 30px -8px rgba(0,0,0,.35);box-sizing:border-box' }, S.cam), { o: 0 }));
      S.ring = el('div', { class: 'abs', style: 'border-radius:50%;box-sizing:border-box;border:24px solid var(--accent)' }, S.cam); reg(S.ring, { o: 0 });
    },
    run(t, b, S) {
      // slow camera push over the whole film, firmer through the end card: nothing is ever static
      put(S.cam, { s: 1 + 0.04 * ease.inOut(seg(t, 0, 'done')) + 0.08 * ease.inOut(seg(t, 'cover', 'done')) });

      // 1) white dot pops on frame 0 (released before t=0 so frame 0 reads), then shrinks away as the pen starts drawing
      const dotK = C.trk(t, [[-0.3, 0.55], [-0.1, 1.3, 'snappy'], [0.45, 1, 'snappy'], [0.75, 0, 'snappy']]);
      put(S.dot, { o: dotK > 0.01 ? 1 : 0, x: CX - 85, y: CY - 85, s: Math.max(0, dotK) });

      // 2) the cord draws itself in white (b0.8 -> b3), 3) the ball hits at pulse (b4): orange logo + white flood from the hit point
      const prog = Math.pow(seg(t, 0.8, 3.0), 0.92), fin = ease.inOut(clamp((prog - 0.86) / 0.14));
      const flood = ease.expoOut(seg(t, 'pulse', beatOf('pulse') + 1.2));
      const mix = ease.out(clamp((t - bt('pulse')) / 0.3));
      drawLogo(S, prog, fin, mix);

      const hitK = t >= bt('pulse') ? Math.exp(-(t - bt('pulse')) * 9) : 0;          // impact decay
      const kick = C.spHit(t, 'end', 'snappy') * (1 - Math.min(1, seg(t, 'end', beatOf('end') + 0.9)));
      const tail = C.spHit(t, 7, 'snappy');
      const ls = LS * (1 - 0.07 * hitK) * (1 + 0.08 * kick) * (1 + 0.05 * tail) * (0.9 + 0.1 * ease.out(clamp(prog * 4)));
      put(S.logo, { o: prog > 0.001 ? 1 : 0, x: LX, y: CY - LH / 2, s: ls, filter: `brightness(${(1 + 0.35 * hitK).toFixed(3)})` });
      put(S.shadow, { o: flood > 0.6 ? Math.min(1, (flood - 0.6) / 0.3) : 0, x: CX - 310, y: CY + 270, s: 1 + 0.05 * kick });

      // white flood: a circle growing from the hit point until it covers the frame
      const fd = lerp(0, 4200, flood);
      put(S.flood, { o: t >= bt('pulse') ? 1 : 0, x: HIT[0] - fd / 2, y: HIT[1] - fd / 2, css: { width: fd + 'px', height: fd + 'px' } });

      // orange ball (white rim so it reads on orange): curves in from bottom-left, accelerating, lands on the hit frame
      const u = Math.pow(seg(t + 0.02, 2.6, 'pulse'), 1.7);
      const bp = (v) => {
        const a = [-140, 1500], c = [140, 620], e = HIT, w = 1 - v;
        return [w * w * a[0] + 2 * w * v * c[0] + v * v * e[0], w * w * a[1] + 2 * w * v * c[1] + v * v * e[1]];
      };
      S.trail.forEach((e, i) => {
        const [x, y] = bp(Math.max(0, u - i * 0.05));
        put(e, { o: (u > 0.001 && u < 0.999) ? 1 - i * 0.3 : 0, x: x - 70, y: y - 70, s: 1 - i * 0.16 });
      });

      // orange ring on the white end card at the final hit, growing from the logo
      const k = Math.pow(ease.out(seg(t + 0.06, 'end', beatOf('end') + 1.4)), 1.8), d = lerp(60, 2900, k);
      put(S.ring, { o: t + 0.06 >= bt('end') ? 1 : 0, x: CX - d / 2, y: CY - d / 2, css: { width: d + 'px', height: d + 'px' } });
    },
  });
  C.start();
})();
