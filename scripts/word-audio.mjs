// Sinh scripts/audio/_gen.txt từ src/data.ts + src/lines.ts (Node ≥ 22.18 tự bỏ type TS) và soát dữ liệu.
// Dùng: node scripts/word-audio.mjs            (gen-audio.sh tự gọi)
//       node scripts/word-audio.mjs --check    (soát dữ liệu + đủ file public/audio/<key>.m4a cho mọi key; exit 1 nếu lỗi)
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const { allGeneratedLines, validateData } = await import(pathToFileURL(join(root, 'src/lines.ts')).href);

const errs = validateData();
let lines = [];
try { lines = allGeneratedLines(); } catch (e) { errs.push(e.message); }
if (errs.length) console.error(`✗ dữ liệu: ${errs.length} lỗi\n   - ${errs.join('\n   - ')}`);
else console.log(`✓ dữ liệu OK (${lines.length} dòng tự sinh)`);

if (!checkOnly) {
  const out = ['# TỰ SINH bởi scripts/word-audio.mjs – ĐỪNG SỬA TAY. Sửa src/data.ts / src/lines.ts rồi chạy lại.',
    ...lines.sort(([a], [b]) => a.localeCompare(b)).map(([k, t, r]) => `${k}|${t}${r ? `|${r}` : ''}`)];
  writeFileSync(join(root, 'scripts/audio/_gen.txt'), out.join('\n') + '\n');
  console.log(`→ scripts/audio/_gen.txt: ${lines.length} dòng`);
} else {
  // mọi key (manifest + tự sinh) phải có file; mọi key game gọi trong src/*.ts dạng play('x') / sfx('x') cũng phải có
  const keys = new Set(lines.map(([k]) => k));
  for (const l of readFileSync(join(root, 'scripts/audio-manifest.txt'), 'utf8').split('\n')) {
    if (!l.trim() || l.trim().startsWith('#')) continue;
    keys.add(l.split('|')[0].trim());
  }
  const src = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.ts')).map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  // play('x') / sfx('x') / say1('x') (không tính actor.play('walk') – clip hoạt hình)
  for (const m of src.matchAll(/(?<![.\w])(?:play|sfx|say1)\(\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
  // talk(actor, ['a', 'b', …]) / speakSequence(['a', …]): mọi chuỗi chữ thường trong mảng (câu khách ck(...) đã soát qua _gen)
  for (const m of src.matchAll(/(?:talk\([^,\[]*,|speakSequence\()\s*\[([^\]]*)\]/g)) for (const k of m[1].matchAll(/(?:^|[[,])\s*'([a-z0-9_]+)'\s*(?=,|$)/g)) keys.add(k[1]);
  const missing = [...keys].filter((k) => !existsSync(join(root, 'public/audio', `${k}.${k.startsWith('sfx_') ? 'ogg' : 'm4a'}`)));
  if (missing.length) { console.error(`✗ thiếu ${missing.length} file audio: ${missing.slice(0, 30).join(', ')}${missing.length > 30 ? '…' : ''}`); errs.push('audio'); }
  else console.log(`✓ đủ audio cho ${keys.size} key`);
}
if (checkOnly && errs.length) process.exit(1);
