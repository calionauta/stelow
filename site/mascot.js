// Mascot behavior in the spirit of koboyo.com/page-mascot:
// eyes follow the cursor, random blinks, squash + wave when poked.
// No dependencies. Respects prefers-reduced-motion.
(function () {
  const svg = document.getElementById('mascot');
  const hint = document.getElementById('mascotHint');
  if (!svg) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pupilL = document.getElementById('pupilL');
  const pupilR = document.getElementById('pupilR');
  const lids = document.querySelectorAll('#lids .lid');
  const mouth = document.getElementById('mouth');
  const messages = [
    'It watches your cursor. Poke it.',
    'Hey. Back to shaping that spec?',
    'Measure three times, cut once.',
    'IN scope. OUT scope. Write both down.',
    'Fresh eyes catch what you miss.',
    'That poke is now in the audit trail.'
  ];
  let msgIndex = 0;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };

  function setTarget(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.52;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const max = 7;
    target.x = (dx / dist) * Math.min(max, dist / 28);
    target.y = (dy / dist) * Math.min(max, dist / 28);
  }
  window.addEventListener('pointermove', (e) => setTarget(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) setTarget(t.clientX, t.clientY);
  }, { passive: true });

  function tick() {
    current.x += (target.x - current.x) * 0.16;
    current.y += (target.y - current.y) * 0.16;
    const s = `translate(${current.x.toFixed(2)} ${current.y.toFixed(2)})`;
    pupilL.setAttribute('transform', s);
    pupilR.setAttribute('transform', s);
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  function blink() {
    lids.forEach((lid) => {
      lid.setAttribute('height', '22');
      lid.setAttribute('y', '92');
      setTimeout(() => lid.setAttribute('height', '0'), 130);
    });
  }
  (function loop() {
    if (!reduce && document.visibilityState === 'visible') blink();
    setTimeout(loop, 2600 + Math.random() * 2800);
  })();

  let pokes = 0;
  function poke() {
    pokes += 1;
    svg.classList.add('poked', 'wave');
    blink();
    if (mouth) mouth.setAttribute('d', 'M 94 141 Q 110 158 126 141');
    msgIndex = (msgIndex + 1) % messages.length;
    if (hint) hint.textContent = messages[msgIndex];
    setTimeout(() => {
      svg.classList.remove('poked', 'wave');
      if (mouth) mouth.setAttribute('d', 'M 96 142 Q 110 152 124 142');
    }, 480);
    if (pokes === 5 && hint) hint.textContent = 'Five pokes. The reviewers approve.';
  }
  svg.addEventListener('pointerdown', poke);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); }
  });
  svg.setAttribute('tabindex', '0');
})();
