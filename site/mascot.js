// Scout mascot, vanilla-JS port of nilbuild/page-mascot src/mascot.tsx (MIT).
// Two 3x3 sprite sheets: pointer angle picks a directions cell (with dead
// zone + hysteresis), a click plays a reactions cell, four fast clicks dizzy.
(function () {
  var DIRECTIONS = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
  var REACTIONS = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];
  var CLOCKWISE = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
  var SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  var HYSTERESIS = 0.12;
  var DEAD_ZONE = 70;
  var PAYOFFS = ['heart', 'sparkle', 'delighted'];
  var BOOP_PAYOFF = 120;
  var BOOP_END = 560;
  var SQUASH_MS = 420;
  var DIZZY_AFTER = 4;
  var DIZZY_WINDOW = 1600;
  var DIZZY_END = 1100;

  var button = document.getElementById('mascot');
  if (!button) return;
  var squash = document.getElementById('mascotSquash');
  var dirLayer = document.getElementById('mascotDirections');
  var reactLayer = document.getElementById('mascotReactions');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];
  var boops = { count: 0, at: 0 };
  var direction = 'left';
  var reaction = null;

  function cell(index) {
    return ((index % 3) * 50) + '% ' + (Math.floor(index / 3) * 50) + '%';
  }
  function wrap(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }
  function render() {
    dirLayer.style.backgroundPosition = cell(DIRECTIONS.indexOf(direction));
    dirLayer.style.opacity = reaction ? '0' : '1';
    reactLayer.style.backgroundPosition = cell(REACTIONS.indexOf(reaction || 'blink'));
    reactLayer.style.opacity = reaction ? '1' : '0';
  }
  function later(ms, next) {
    timers.push(window.setTimeout(function () {
      reaction = next;
      render();
    }, ms));
  }

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    var sector = -1;
    var pointer = null;
    var aim = function () {
      if (!pointer) return;
      var box = button.getBoundingClientRect();
      var dx = pointer.x - (box.left + box.width / 2);
      var dy = pointer.y - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        if (direction !== 'left') { direction = 'left'; render(); }
        return;
      }
      var angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      var next = CLOCKWISE[sector];
      if (next !== direction) { direction = next; render(); }
    };
    window.addEventListener('pointermove', function (e) {
      pointer = { x: e.clientX, y: e.clientY };
      aim();
    }, { passive: true });
    window.addEventListener('scroll', aim, { passive: true });
  }

  button.addEventListener('click', function () {
    timers.forEach(window.clearTimeout);
    timers = [];
    var now = Date.now();
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;
    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      reaction = 'dizzy';
      render();
      later(DIZZY_END, null);
    } else {
      reaction = 'blink';
      render();
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }
    if (reduceMotion || !squash.animate) return;
    squash.animate(
      [
        { transform: 'scale(1, 1)', easing: 'ease-in' },
        { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
        { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
        { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
        { transform: 'scale(1, 1)' }
      ],
      { duration: SQUASH_MS, easing: 'linear' }
    );
  });

  render();
})();
