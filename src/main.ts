// Khởi động: dựng tiệm 3D (sống ngay sau màn đầu), chọn cấp, chạy ngày bán hàng.
import { Game } from './game.ts';
import { els, wobbleEl } from './ui.ts';
import { unlockAudio, play, setMuted, stopSpeech } from './audio.ts';
import { loadProgress, level2Unlocked, PARAM } from './progress.ts';

const progress = loadProgress();
if (PARAM.mute) setMuted(true);
if (PARAM.debug) els.debug.hidden = false;

const game = new Game(document.getElementById('app')!, progress);
game.start();

function refreshLevels(): void {
  const l2 = level2Unlocked(progress);
  els.lvl2.classList.toggle('locked', !l2);
  els.lvl2.classList.toggle('go', l2);
  els.lvl1.classList.toggle('go', !l2);
}

let starting = false;
async function begin(level: number, again = false): Promise<void> {
  if (starting) return;
  starting = true;
  unlockAudio();
  els.start.classList.add('hide');
  els.dayend.classList.add('hide');
  // chống chạm đúp; không chờ cả ngày xong (về menu giữa chừng thì luồng cũ tự thoát)
  setTimeout(() => { starting = false; }, 900);
  await game.startDay(level, again);
}

function toMenu(): void {
  game.stopDay();
  refreshLevels();
  els.start.classList.remove('hide');
}

els.lvl1.addEventListener('click', () => { unlockAudio(); void begin(1); });
els.lvl2.addEventListener('click', () => {
  unlockAudio();
  if (!level2Unlocked(progress) && !PARAM.level) {
    wobbleEl(els.lvl2);
    stopSpeech();
    void play('level_locked');
    return;
  }
  void begin(2);
});
els.home.addEventListener('click', () => toMenu());
els.btnMenu.addEventListener('click', () => toMenu());
els.btnAgain.addEventListener('click', () => { game.stopDay(); void begin(game.level.id, true); });
els.btnLevel2.addEventListener('click', () => { game.stopDay(); void begin(2); });

refreshLevels();
game.init().then(() => {
  els.fade.classList.add('off');
  // ?level=N&auto=1: vào thẳng (auto/headless không cần chạm mở tiếng)
  if (PARAM.level || PARAM.auto) void begin(PARAM.level || 1);
}).catch((e) => {
  console.error('[bakery] lỗi dựng tiệm', e);
  els.fade.querySelector('.loader')!.textContent = '🔄';
  els.fade.style.pointerEvents = 'auto';
  els.fade.addEventListener('pointerup', () => location.reload(), { once: true });
});

// soát / tự chơi: lộ game ra window (dev, hoặc ?debug=1 / ?auto=1 trên bản build)
if (import.meta.env.DEV || PARAM.debug || PARAM.auto) (window as unknown as { __game: Game }).__game = game;
