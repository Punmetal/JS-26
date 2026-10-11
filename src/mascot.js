// A live vector character: pupils stay separate from the body so they can follow
// the pointer without moving the eyes or introducing image/network dependencies.
let instance = 0;
export function mascotMarkup(mood = 'calm') {
  const id = `jobu-face-${++instance}`;
  const eye = (side, x) => `<g class="mascot-eye eye-${side}"><ellipse cx="${x}" cy="77" rx="21" ry="27" fill="#fffdfb"/><g class="mascot-pupil"><ellipse cx="${x + 1}" cy="80" rx="12" ry="19" fill="url(#${id}-eye)"/><ellipse cx="${x + 5}" cy="69" rx="4" ry="5" fill="#fff"/><circle cx="${x - 3}" cy="87" r="2" fill="#fff" opacity=".55"/></g></g><path class="mascot-lid lid-${side}" d="M${x - 15} 77q15 12 30 0"/>`;
  return `<div class="jobu-mascot" data-mood="${mood}" aria-hidden="true"><svg class="mascot-float" viewBox="0 0 160 160" focusable="false"><defs><linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd5df"/><stop offset=".48" stop-color="#ffb5d0"/><stop offset="1" stop-color="#fa76aa"/></linearGradient><radialGradient id="${id}-glow" cx=".78" cy=".12" r=".8"><stop stop-color="#fff1dd" stop-opacity=".8"/><stop offset="1" stop-color="#fff1dd" stop-opacity="0"/></radialGradient><linearGradient id="${id}-eye" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#29232d"/><stop offset=".78" stop-color="#3b2030"/><stop offset="1" stop-color="#a73257"/></linearGradient></defs><ellipse class="mascot-shadow" cx="80" cy="149" rx="47" ry="5" fill="#f43f8e" opacity=".1"/><g class="mascot-character"><rect x="16" y="18" width="128" height="128" rx="43" fill="url(#${id}-body)"/><rect x="16" y="18" width="128" height="128" rx="43" fill="url(#${id}-glow)"/><path d="M29 46Q38 22 77 22h27" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>${eye('left', 52)}${eye('right', 109)}<g class="mascot-cheeks" fill="#f43f8e" opacity=".42"><ellipse cx="34" cy="106" rx="10" ry="6"/><ellipse cx="130" cy="106" rx="10" ry="6"/></g><path class="mascot-mouth mouth-calm" d="M70 109q10 17 20 0" fill="none" stroke="#452132" stroke-width="5" stroke-linecap="round"/><g class="mascot-mouth mouth-happy"><path d="M65 105Q80 110 95 105q1 25-15 25t-15-25" fill="#a81946"/><path d="M68 105q12 4 24 0q-1 8-12 8t-12-8" fill="#fffdfb"/><ellipse cx="80" cy="124" rx="10" ry="7" fill="#ff7095"/></g><ellipse class="mascot-mouth mouth-surprised" cx="80" cy="116" rx="7" ry="9" fill="#75283f"/><g class="mascot-sparkle" stroke="#f43f8e" stroke-width="3" fill="none" stroke-linejoin="round"><path d="M142 8l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M13 22l-5-4m6 14-7 1" stroke-linecap="round"/></g></g></svg></div>`;
}

export function createMascot() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let face = null, frame = 0, blinkTimer = 0, blinkEnd = 0, reactionTimer = 0;
  let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
  let firstGreeting = true, reaction = null;
  const applyMood = mood => { if (face) face.dataset.mood = mood; };
  const restingMood = () => face?.closest('.empty-state') ? (face.dataset.restMood || 'surprised') : 'calm';
  function center() {
    cancelAnimationFrame(frame); frame = 0;
    currentX = currentY = targetX = targetY = 0;
    face?.style.setProperty('--look-x', '0px'); face?.style.setProperty('--look-y', '0px');
  }
  function animateEyes() {
    if (!face?.isConnected || reduced.matches || document.hidden) { frame = 0; return; }
    currentX += (targetX - currentX) * .18; currentY += (targetY - currentY) * .18;
    face.style.setProperty('--look-x', `${currentX.toFixed(2)}px`);
    face.style.setProperty('--look-y', `${currentY.toFixed(2)}px`);
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .03) frame = requestAnimationFrame(animateEyes);
    else frame = 0;
  }
  function scheduleBlink() {
    clearTimeout(blinkTimer); clearTimeout(blinkEnd);
    if (!face || reduced.matches || document.hidden) return;
    blinkTimer = setTimeout(() => {
      if (face?.isConnected && !face.closest('[inert]')) {
        face.classList.add('is-blinking');
        blinkEnd = setTimeout(() => face?.classList.remove('is-blinking'), 150);
      }
      blinkTimer = setTimeout(scheduleBlink, 250);
    }, 4000 + Math.random() * 3000);
  }
  function react(mood, duration = 1600) {
    clearTimeout(reactionTimer); reaction = mood; applyMood(mood);
    if (!reduced.matches && face) {
      face.classList.remove('is-celebrating');
      if (mood === 'happy' || mood === 'playful') {
        // Restart this short, purposeful animation only after a user action.
        void face.offsetWidth; face.classList.add('is-celebrating');
      }
    }
    reactionTimer = setTimeout(() => { reaction = null; applyMood(restingMood()); face?.classList.remove('is-celebrating'); }, duration);
  }
  function sync() {
    clearTimeout(blinkTimer); clearTimeout(blinkEnd);
    face = document.querySelector('.modal .jobu-mascot') || document.querySelector('#app .jobu-mascot');
    center(); if (!face) return;
    face.dataset.restMood = face.dataset.mood;
    if (restingMood() === 'surprised') { clearTimeout(reactionTimer); reaction = null; }
    applyMood(reaction || restingMood()); scheduleBlink();
    if (firstGreeting) { firstGreeting = false; react('happy', 1800); }
  }
  document.addEventListener('pointermove', event => {
    if (!face || face.closest('[inert]') || !finePointer.matches || reduced.matches || event.pointerType !== 'mouse') return;
    const box = face.getBoundingClientRect();
    targetX = Math.max(-5.5, Math.min(5.5, (event.clientX - box.x - box.width / 2) / 70));
    targetY = Math.max(-4, Math.min(4, (event.clientY - box.y - box.height / 2) / 95));
    if (!frame) frame = requestAnimationFrame(animateEyes);
  }, { passive: true });
  const interactive = 'button:not(:disabled),a,input,select,textarea,summary';
  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'mouse' && !reaction && event.target.closest('.jobu-mascot')) { react('playful', 1100); return; }
    if (event.pointerType === 'mouse' && !reaction && restingMood() !== 'surprised' && event.target.closest(interactive)) applyMood('curious');
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!reaction && !event.relatedTarget?.closest?.(interactive)) applyMood(restingMood());
  }, { passive: true });
  document.addEventListener('focusin', event => { if (!reaction && restingMood() !== 'surprised' && event.target.closest(interactive)) applyMood('curious'); });
  document.addEventListener('focusout', () => { if (!reaction) applyMood(restingMood()); });
  document.addEventListener('pointerleave', center);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { center(); clearTimeout(blinkTimer); clearTimeout(blinkEnd); face?.classList.remove('is-blinking'); }
    else scheduleBlink();
  });
  reduced.addEventListener('change', () => { center(); face?.classList.remove('is-blinking', 'is-celebrating'); scheduleBlink(); });
  return { sync, react };
}
