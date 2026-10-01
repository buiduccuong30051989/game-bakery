#!/usr/bin/env bash
# Sinh audio tiếng Việt offline bằng giọng Linh của macOS.
# Nguồn: scripts/audio-manifest.txt (câu chung) + scripts/audio/_gen.txt (tự sinh từ src/data.ts bởi word-audio.mjs).
# Dòng: key|text|rate (rate tuỳ chọn, mặc định RATE).
# Dùng: bash scripts/gen-audio.sh           (chỉ sinh clip CHƯA có)
#       FORCE=1 bash scripts/gen-audio.sh   (sinh lại tất cả)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/audio
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
VOICE=${VOICE:-Linh}
RATE=${RATE:-150}
FORCE=${FORCE:-0}
mkdir -p "$OUT"

node scripts/word-audio.mjs

# gộp nguồn, bỏ comment/dòng trống, key trùng giữ bản đầu (báo nếu khác chữ) – awk chạy được với bash 3.2 của macOS
awk -F'|' '
  /^[[:space:]]*#/ || NF < 2 { next }
  { k = $1; sub(/[[:space:]]+$/, "", k)
    if (k in seen) { if (seen[k] != $2) printf("! trùng key %s (%s): giữ bản đầu\n", k, FILENAME) > "/dev/stderr"; next }
    seen[k] = $2; print k "|" $2 "|" $3 }
' scripts/audio-manifest.txt scripts/audio/_gen.txt > "$TMP/all.txt"

n=0; skip=0
while IFS='|' read -r key text rate; do
  if [[ "$FORCE" != "1" && -s "$OUT/$key.m4a" ]]; then skip=$((skip+1)); continue; fi
  say -v "$VOICE" -r "${rate:-$RATE}" -o "$TMP/$key.aiff" "$text"
  afconvert -f m4af -d aac -b 64000 "$TMP/$key.aiff" "$OUT/$key.m4a"
  n=$((n+1))
done < "$TMP/all.txt"
echo "generated $n clips, skipped $skip existing -> $OUT"
