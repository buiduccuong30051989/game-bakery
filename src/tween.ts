// Tween tối giản, không thư viện. Cập nhật trong render loop qua updateTweens(dt).

type Ease = (t: number) => number;
export const easeOutBack: Ease = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
export const easeOutQuad: Ease = (t) => 1 - (1 - t) * (1 - t);
export const easeInQuad: Ease = (t) => t * t;
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const linear: Ease = (t) => t;

interface Tween { t: number; dur: number; ease: Ease; fn: (k: number) => void; done?: () => void }
const active: Tween[] = [];

export function tween(durMs: number, fn: (k: number) => void, ease: Ease = easeOutQuad): Promise<void> {
  return new Promise((resolve) => {
    active.push({ t: 0, dur: Math.max(durMs, 1) / 1000, ease, fn, done: resolve });
  });
}

export function updateTweens(dt: number): void {
  for (let i = active.length - 1; i >= 0; i--) {
    const tw = active[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    try { tw.fn(tw.ease(k)); } catch (e) { console.error(e); tw.t = tw.dur; }
    if (tw.t >= tw.dur) {
      const idx = active.indexOf(tw);
      if (idx >= 0) active.splice(idx, 1);
      tw.done?.();
    }
  }
}

/** Kết thúc ngay mọi tween (đổi màn): gọi fn(1) để trạng thái về đích, resolve promise. */
export function finishAllTweens(): void {
  const list = active.splice(0);
  for (const tw of list) { try { tw.fn(tw.ease(1)); } catch { /* bỏ qua */ } tw.done?.(); }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
