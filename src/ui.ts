// DOM: HUD, thẻ gọi món (bong bóng cạnh đầu khách), chuông, tay chỉ, bảng chọn, toast, pháo giấy, sao bay.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const els = {
  hud: $('hud'), home: $<HTMLButtonElement>('home'), say: $<HTMLButtonElement>('say'), stars: $('stars'), starsN: $('stars-n'), daypips: $('daypips'),
  order: $('order'), ordPic: $<HTMLButtonElement>('ord-pic'), ordWord: $<HTMLButtonElement>('ord-word'), ordQty: $('ord-qty'), ordPips: $('ord-pips'),
  bell: $<HTMLButtonElement>('bell'), hand: $('hand'),
  panel: $('panel'), panelEmoji: $('panel-emoji'), panelWord: $('panel-word'), panelPrice: $('panel-price'), options: $('options'),
  toast: $('toast'), confetti: $('confetti'), fade: $('fade'), debug: $('debug'),
  start: $('start'), lvl1: $<HTMLButtonElement>('lvl1'), lvl2: $<HTMLButtonElement>('lvl2'),
  dayend: $('dayend'), dayendActions: $('dayend-actions'), dayendFaces: $('dayend-faces'), dayendStars: $('dayend-stars'), dayendNext: $('dayend-next'),
  btnAgain: $<HTMLButtonElement>('btn-again'), btnLevel2: $<HTMLButtonElement>('btn-level2'), btnMenu: $<HTMLButtonElement>('btn-menu'),
};

/** Chữ thành từng span (đánh vần sáng từng chữ). blank = index ô trống. */
export function renderWord(el: HTMLElement, word: string, lit: number[] = [], whole = false, blank = -1): void {
  el.innerHTML = '';
  el.classList.toggle('whole', whole);
  Array.from(word).forEach((ch, i) => {
    const s = document.createElement('span');
    if (i === blank) { s.textContent = '?'; s.className = 'blank'; }
    else { s.textContent = ch; if (lit.includes(i)) s.className = 'lit'; }
    el.appendChild(s);
  });
}

export function wobbleEl(el: Element): void {
  el.classList.remove('wobble');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('wobble');
}
export function bumpEl(el: Element, cls = 'bump'): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

let toastTimer = 0;
export function toast(text: string, ms = 1300): void {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
}

export function confetti(n = 70): void {
  const cols = ['#ff5fb4', '#ffc233', '#58cc02', '#2f9df5', '#ff9600', '#b48cff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = cols[i % cols.length];
    c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    els.confetti.appendChild(c);
    setTimeout(() => c.remove(), 3800);
  }
}

/** Ngôi sao bay từ (x,y) màn hình tới ô ⭐ trên HUD. */
export function flyStar(x: number, y: number): Promise<void> {
  const s = document.createElement('div');
  s.className = 'flystar';
  s.textContent = '⭐';
  s.style.left = `${x - 40}px`;
  s.style.top = `${y - 40}px`;
  document.body.appendChild(s);
  const r = els.stars.getBoundingClientRect();
  return new Promise((res) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      s.style.transform = `translate(${r.left + 20 - x}px, ${r.top + r.height / 2 - y}px) scale(.55) rotate(360deg)`;
    }));
    setTimeout(() => { s.remove(); res(); }, 950);
  });
}

/** Bảng chọn: nút lớn; onPick(value, btn). */
export function showOptions(items: { label: string; value: string }[], onPick: (value: string, btn: HTMLButtonElement) => void): HTMLButtonElement[] {
  els.options.innerHTML = '';
  return items.map((it) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = it.label;
    b.dataset.value = it.value;
    b.addEventListener('click', () => onPick(it.value, b));
    els.options.appendChild(b);
    return b;
  });
}

export function showPanel(on: boolean, chalk = false): void {
  els.panel.hidden = !on;
  els.panel.classList.toggle('chalk', chalk);
  if (!on) { els.options.innerHTML = ''; els.panelEmoji.hidden = true; els.panelWord.hidden = true; els.panelPrice.hidden = true; }
}

/** Đặt tay chỉ ở toạ độ màn hình (ngón tay ở điểm đó), null = ẩn. */
export function pointAt(x: number | null, y = 0): void {
  if (x === null) { els.hand.hidden = true; return; }
  els.hand.hidden = false;
  els.hand.style.transform = `translate(${x - 34}px, ${y - 4}px)`;
}
