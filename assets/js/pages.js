// Behaviour for the inner pages: filters on /work, copy on /contact, letters on titles, scroll-velocity skew on thumbnails.
import { lettersIn } from './ui.js';

export function mountPage(main, { sound, lenis }) {
  const cleanup = [];
  main.querySelectorAll('[data-split]').forEach((el, i) => lettersIn(el, { delay: 0.15 + i * 0.1, onLetter: () => sound.tick() }));
  if (window.gsap) {
    const rest = main.querySelectorAll('.pg-head .eyebrow, .dt-lead, .dt-spec, .dt-links, .ct-lead, .ab-grid, .wx, .dt-body, .ct-rows');
    if (rest.length) window.gsap.fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.35, stagger: 0.08 });
  }

  // /work filters
  const filters = [...main.querySelectorAll('[data-filter]')];
  const cards = [...main.querySelectorAll('.wx-card')];
  filters.forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.filter;
    filters.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    cards.forEach((c) => { c.hidden = !(f === 'All' || c.dataset.tags.split('|').includes(f)); });
    if (window.gsap) window.gsap.fromTo(cards.filter((c) => !c.hidden), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 });
    sound.tick();
  }));

  // thumbnails lean with scroll speed, the way the reference bends its grid
  const grid = main.querySelector('.wx-grid');
  if (grid && lenis) {
    let skew = 0;
    const onScroll = ({ velocity }) => { skew = Math.max(-4, Math.min(4, velocity * 0.12)); grid.style.setProperty('--skew', skew.toFixed(2) + 'deg'); };
    cleanup.push(lenis.on('scroll', onScroll));
  }

  // without the canvas, the capability videos play only while on screen
  const vids = [...main.querySelectorAll('.cap-video')];
  if (vids.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.25 });
    vids.forEach((v) => io.observe(v));
    cleanup.push(() => io.disconnect());
  }

  // copy the email address
  main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const v = b.dataset.copy;
    try { await navigator.clipboard.writeText(v); b.textContent = 'Copied'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling.querySelector('.ct-v')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1800);
  }));

  return () => cleanup.forEach((f) => f());
}
