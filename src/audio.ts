// Audio: WebAudio, mở khoá bằng chạm đầu tiên (iPad Safari), clip m4a sinh sẵn + sfx ogg + hộp nhạc tổng hợp.
// play() LUÔN resolve (kể cả khi thiếu file / context bị treo) để luồng game không bao giờ kẹt.

const clips = new Map<string, AudioBuffer | null>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
const missing = new Set<string>();

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    // iPadOS 16.4+: không bị nút gạt im lặng chặn
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session && 'type' in session) session.type = 'playback';
  }
  return ctx;
}
function out(): GainNode { getCtx(); return master!; }

let muted = false;
/** Tắt tiếng toàn bộ (?mute=1): clip vẫn chạy đúng thời lượng để luồng game giữ nhịp. */
export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}

/** Gọi ĐỒNG BỘ trong handler click/touchend đầu tiên. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
  if (!unlocked) {
    // phát 1 buffer câm để iOS chịu mở loa
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  }
}
/**
 * iPad: khoá màn hình / chuyển app / Siri → context 'interrupted'/'suspended', không tự chạy lại → game câm.
 * Mỗi lần quay lại trang hoặc chạm bất kỳ đâu: resume().
 */
function resumeIfNeeded(): void {
  if (ctx && unlocked && ctx.state !== 'running') void ctx.resume().catch(() => { /* chờ chạm sau */ });
}
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeIfNeeded(); });
  window.addEventListener('pointerdown', resumeIfNeeded, { capture: true });
  window.addEventListener('focus', resumeIfNeeded);
}
export function isUnlocked(): boolean { return unlocked && ctx?.state === 'running'; }

const extOf = (key: string) => (key.startsWith('sfx_') ? 'ogg' : 'm4a');

function load(key: string): Promise<AudioBuffer | null> {
  if (clips.has(key)) return Promise.resolve(clips.get(key)!);
  let p = loading.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}audio/${key}.${extOf(key)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.arrayBuffer();
        const buf = await getCtx().decodeAudioData(data);
        clips.set(key, buf);
        return buf;
      } catch {
        if (!missing.has(key)) { missing.add(key); console.warn('[audio] thiếu clip', key); }
        clips.set(key, null);
        return null;
      } finally {
        loading.delete(key);
      }
    })();
    loading.set(key, p);
  }
  return p;
}

export function preload(keys: string[]): Promise<unknown> {
  return Promise.all([...new Set(keys)].map((k) => load(k)));
}
/** Có file audio cho key không (sau khi đã thử tải). */
export async function hasClip(key: string): Promise<boolean> { return (await load(key)) !== null; }
export function missingClips(): string[] { return [...missing]; }

let current: AudioBufferSourceNode | null = null;
let currentDone: (() => void) | null = null;
let seqToken = 0;

/** Phát 1 clip, resolve khi phát xong. Clip giọng mới cắt clip giọng đang phát (sfx thì chồng lên). */
export function play(key: string, opts: { volume?: number; cut?: boolean } = {}): Promise<void> {
  return load(key).then((buf) => {
    if (!buf) return;
    const c = getCtx();
    const voice = !key.startsWith('sfx_');
    if (voice && opts.cut !== false) stopVoice();
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = opts.volume ?? 1;
    src.connect(gain).connect(out());
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (current === src) { current = null; currentDone = null; }
        resolve();
      };
      // context bị treo (chưa chạm / iOS ngắt) thì onended không bao giờ tới → hẹn giờ dự phòng
      const timer = window.setTimeout(finish, buf.duration * 1000 + 400);
      src.onended = finish;
      if (voice) { current = src; currentDone = finish; }
      try { src.start(0); } catch { finish(); }
    });
  });
}

function stopVoice(): void {
  if (current) {
    const done = currentDone;
    try { current.stop(); } catch { /* đã dừng */ }
    current = null; currentDone = null;
    done?.();
  }
}

export function sfx(key: string, volume = 0.6): void {
  void play(key, { volume, cut: false });
}

/** Phát tuần tự, gọi onToken(i) trước mỗi clip. Sequence mới huỷ sequence cũ. Trả false nếu bị huỷ. */
export async function speakSequence(keys: string[], onToken?: (i: number) => void, gapMs = 220): Promise<boolean> {
  const my = ++seqToken;
  for (let i = 0; i < keys.length; i++) {
    if (my !== seqToken) return false;
    onToken?.(i);
    await play(keys[i]);
    if (my !== seqToken) return false;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return my === seqToken;
}

export function stopSpeech(): void {
  seqToken++;
  stopVoice();
}

// ---------- hộp nhạc tổng hợp (không cần file) ----------
const NOTE: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function freq(n: string): number {
  // "C5", "F#4", "Bb4"
  const m = /^([A-G])([#b]?)(\d)$/.exec(n);
  if (!m) return 440;
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semi / 12);
}

let musicGain: GainNode | null = null;
/** Hộp nhạc: chuỗi "C5:1 E5:1 G5:2 -:1" (nốt:phách, "C5+E5" = hợp âm). Resolve khi hết bài. */
export function musicBox(score: string, bpm = 132, volume = 0.22, loops = 1): Promise<void> {
  const c = getCtx();
  if (c.state !== 'running') return Promise.resolve();
  stopMusic();
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(out());
  musicGain = g;
  const beat = 60 / bpm;
  let t = c.currentTime + 0.05;
  const notes = score.trim().split(/\s+/).map((s) => { const [n, d] = s.split(':'); return { n, d: Number(d || 1) }; });
  for (let l = 0; l < loops; l++) {
    for (const { n, d } of notes) {
      if (n !== '-') for (const part of n.split('+')) bell(c, g, freq(part), t, d * beat);
      t += d * beat;
    }
  }
  const total = (t - c.currentTime) * 1000;
  return new Promise((r) => setTimeout(r, total));
}
function bell(c: AudioContext, dest: AudioNode, f: number, t: number, dur: number): void {
  for (const [mul, amp, type] of [[1, 1, 'sine'], [2, 0.35, 'triangle'], [3, 0.12, 'sine']] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f * mul;
    const e = c.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    e.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, dur * 1.6));
    o.connect(e).connect(dest);
    o.start(t);
    o.stop(t + Math.max(0.4, dur * 1.7));
  }
}
/** Chuông ngắn chồng lên nhạc nền (không cắt nhạc). */
export function chime(score: string, bpm = 220, volume = 0.18): void {
  const c = getCtx();
  if (c.state !== 'running') return;
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(out());
  const beat = 60 / bpm;
  let t = c.currentTime + 0.02;
  for (const s of score.trim().split(/\s+/)) {
    const [n, d] = s.split(':');
    if (n !== '-') for (const part of n.split('+')) bell(c, g, freq(part), t, Number(d || 1) * beat);
    t += Number(d || 1) * beat;
  }
  setTimeout(() => g.disconnect(), (t - c.currentTime) * 1000 + 2000);
}
export function stopMusic(): void {
  if (musicGain && ctx) {
    const g = musicGain;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    setTimeout(() => g.disconnect(), 800);
    musicGain = null;
  }
}

/** Nhạc dạ hội (valse 3/4). */
export const WALTZ = [
  'C5:1 E5:1 G5:1', 'C6:2 G5:1', 'A5:1 F5:1 A5:1', 'G5:3',
  'F5:1 A5:1 C6:1', 'B5:2 G5:1', 'A5:1 G5:1 F5:1', 'E5:3',
  'D5:1 F5:1 A5:1', 'G5:2 E5:1', 'F5:1 E5:1 D5:1', 'C5+E5+G5:3',
].join(' ');
/** Leng keng ngắn khi băng tan. */
export const CHIME = 'E6:0.5 G6:0.5 C7:1';
export const CHIME_BIG = 'C6:0.5 E6:0.5 G6:0.5 C7:0.5 E7:1.5';
