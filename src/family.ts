// GIA ĐÌNH NHÍM (copy từ game 3, đổi câu khen sang tiệm bánh): ba, mẹ, bà, ông, bác cổ vũ bé. Bong bóng lớn trượt vào từ mép phải ~2.5 s (ảnh/emoji + tên + câu nói)
// kèm giọng đọc. Ảnh thật: thả public/family/<id>.jpg (hoặc .jpeg/.png/.webp) → tự thay emoji (xem README).
// Danh sách ảnh có sẵn lấy từ module ảo 'virtual:family-photos' (vite.config.ts quét thư mục lúc dev/build)
// → không gọi thử file không tồn tại, console sạch 404.
import photos from 'virtual:family-photos';
import { play, sfx } from './audio.ts';
import { wait } from './tween.ts';

import type { FamilyId } from './data.ts';
export type { FamilyId };

export interface FamilyMember {
  id: FamilyId;
  /** tên hiện trên bong bóng */
  name: string;
  emoji: string;
  /** màu viền bong bóng */
  color: string;
  /** câu khen ngẫu nhiên: [audio key, chữ hiện] (câu đọc ở scripts/audio-manifest.txt) */
  lines: [string, string][];
  /** câu ngắn khi cả nhà lần lượt cổ vũ (đóng cửa tiệm) */
  ball: [string, string];
}

export const FAMILY: FamilyMember[] = [
  {
    id: 'ba-cuong', name: 'Ba Cường', emoji: '👨', color: '#2f9df5',
    lines: [['fam_ba_cuong_1', 'Nhím bán hàng giỏi quá!'], ['fam_ba_cuong_2', 'Ba mua bánh của Nhím mỗi ngày!'], ['fam_ba_cuong_3', 'Ba giơ ngón tay cái cho Nhím nè! 👍']],
    ball: ['fam_ba_cuong_ball', 'Hoan hô chủ tiệm Nhím!'],
  },
  {
    id: 'me-yen', name: 'Mẹ Yến', emoji: '👩', color: '#ff5fb4',
    lines: [['fam_me_yen_1', 'Bánh của Nhím ngon nhất!'], ['fam_me_yen_2', 'Mẹ thương Nhím nhất trên đời! 💕'], ['fam_me_yen_3', 'Nhím đếm giỏi quá!']],
    ball: ['fam_me_yen_ball', 'Nhím giỏi nhất!'],
  },
  {
    id: 'ba-tuyet', name: 'Bà Tuyết', emoji: '👵', color: '#8b5cf6',
    lines: [['fam_ba_tuyet_1', 'Cháu bà bán hàng khéo quá!'], ['fam_ba_tuyet_2', 'Bà thương Nhím nhiều lắm!'], ['fam_ba_tuyet_3', 'Bà ôm Nhím một cái thật chặt! 🤗']],
    ball: ['fam_ba_tuyet_ball', 'Bà thương Nhím!'],
  },
  {
    id: 'ong-cuong', name: 'Ông Cương', emoji: '👴', color: '#3f9b1f',
    lines: [['fam_ong_cuong_1', 'Ông vỗ tay cho Nhím nè! 👏'], ['fam_ong_cuong_2', 'Chủ tiệm nhỏ giỏi quá!'], ['fam_ong_cuong_3', 'Ông cười tít mắt vì Nhím đó!']],
    ball: ['fam_ong_cuong_ball', 'Tuyệt vời cháu ơi!'],
  },
  {
    id: 'bac-hanh', name: 'Bác Hanh', emoji: '👩‍🦱', color: '#ff9600',
    lines: [['fam_bac_hanh_1', 'Bác thơm Nhím một cái! 😘'], ['fam_bac_hanh_2', 'Nhím thông minh quá!'], ['fam_bac_hanh_3', 'Tiệm của Nhím đẹp quá!']],
    ball: ['fam_bac_hanh_ball', 'Thơm Nhím nào!'],
  },
];

/** Mọi audio key của gia đình (tải trước cùng COMMON_KEYS). */
export const FAMILY_KEYS = [...FAMILY.flatMap((m) => [...m.lines.map(([k]) => k), m.ball[0]]), 'fam_all'];

/** URL ảnh thật của 1 người (nếu bố mẹ đã thả ảnh vào public/family/), không thì null. */
export function photoUrl(id: FamilyId): string | null {
  const f = photos[id];
  return f ? `${import.meta.env.BASE_URL}family/${f}` : null;
}

// ------------------------------------------------------------------ bong bóng DOM
let box: HTMLElement | null = null;
function container(): HTMLElement {
  if (!box) {
    box = document.createElement('div');
    box.id = 'family';
    document.body.appendChild(box);
  }
  return box;
}

/** Ô ảnh tròn: ảnh thật nếu có, lỗi tải thì về emoji. */
export function avatarEl(m: FamilyMember, cls = 'fam-ava'): HTMLElement {
  const a = document.createElement('div');
  a.className = cls;
  a.style.borderColor = m.color;
  const url = photoUrl(m.id);
  if (url) {
    const img = document.createElement('img');
    img.alt = m.name;
    img.src = url;
    img.onerror = () => { img.remove(); a.textContent = m.emoji; };
    a.appendChild(img);
  } else a.textContent = m.emoji;
  return a;
}

function card(m: FamilyMember, text: string, mini: boolean): HTMLElement {
  const c = document.createElement('div');
  c.className = 'fam-card' + (mini ? ' mini' : '');
  c.style.setProperty('--fam', m.color);
  c.appendChild(avatarEl(m));
  const body = document.createElement('div');
  body.className = 'fam-body';
  const name = document.createElement('div');
  name.className = 'fam-name';
  name.textContent = m.name;
  const say = document.createElement('div');
  say.className = 'fam-say';
  say.textContent = text;
  body.append(name, say);
  c.appendChild(body);
  container().appendChild(c);
  return c;
}

function dismiss(c: HTMLElement): void {
  c.classList.add('out');
  setTimeout(() => c.remove(), 450);
}

/** Túi xáo trộn: lần lượt đủ 5 người rồi mới lặp lại. */
let bag: FamilyMember[] = [];
function nextMember(): FamilyMember {
  if (!bag.length) bag = [...FAMILY].sort(() => Math.random() - 0.5);
  return bag.pop()!;
}

let showing = false;
/** Đang có bong bóng gia đình trên màn. */
export function familyBusy(): boolean { return showing; }

/** 1 người nhà cổ vũ: bong bóng ~2.5 s + giọng đọc. Resolve khi xong. Đang có bong bóng khác thì bỏ qua. */
export async function familyCheer(id?: FamilyId): Promise<void> {
  if (showing) return;
  showing = true;
  try {
    const m = id ? FAMILY.find((x) => x.id === id)! : nextMember();
    const [key, text] = m.lines[Math.floor(Math.random() * m.lines.length)];
    sfx('sfx_pop', 0.4);
    const c = card(m, text, false);
    await Promise.all([play(key), wait(2500)]);
    dismiss(c);
    await wait(250);
  } finally {
    showing = false;
  }
}

/** Cả nhà lần lượt cổ vũ (cuối ngày): bong bóng xếp chồng, đủ 5 người rồi cùng trượt ra. */
export async function familyCheerAll(alive: () => boolean = () => true): Promise<void> {
  if (showing) return;
  showing = true;
  const cards: HTMLElement[] = [];
  try {
    for (const m of FAMILY) {
      if (!alive()) break;
      sfx('sfx_pop', 0.4);
      cards.push(card(m, m.ball[1], true));
      await Promise.all([play(m.ball[0]), wait(1300)]);
    }
    if (alive()) await play('fam_all');
    await wait(600);
  } finally {
    cards.forEach((c, i) => setTimeout(() => dismiss(c), i * 90));
    showing = false;
  }
}

/** Đổi màn: dọn bong bóng còn sót. */
export function clearFamily(): void {
  if (box) box.innerHTML = '';
}
