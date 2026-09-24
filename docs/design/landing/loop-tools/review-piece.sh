#!/bin/bash
# Render one landing piece for the critics and build its blind A/B folder.
# Usage: review-piece.sh <hero|how|why|final> <round>
set -e
# Output goes to $LOOP_OUT (default: a loop-output folder next to this script).
S=$(cd "$(dirname "$0")" && pwd)
OUT=${LOOP_OUT:-$S/loop-output}
P=$1; N=$2; R=$OUT/review/$P/r$N; SEL="#landing-$P"
# Tall multi-row sections are captured with the whole section on screen.
TALL=""; case $P in how|why) TALL="--tall" ;; esac
cd $S
node render.mjs --out $R --selector "$SEL" --widths 1440,390 --scrollthrough $TALL
node render.mjs --out $R --selector "$SEL" --widths 1440 --theme dark --scrollthrough $TALL
node render.mjs --out $R --selector "$SEL" --widths 390 --reduced --scrollthrough $TALL
node render.mjs --out $R/noscroll --selector "$SEL" --widths 1440
# Second visit: scroll through, back to top, return. Filmstrip of the replay,
# then the settled state, which must match the first pass.
TOPWAIT=1200; [ $P = hero ] && TOPWAIT=0
node render.mjs --out $R/revisit-film --selector "$SEL" --widths 1440 --scrollthrough --revisit --frames 6 --interval 250 --settle 50 --viewport --topwait $TOPWAIT
node render.mjs --out $R/revisit --selector "$SEL" --widths 1440,390 --scrollthrough --revisit --settle 2500 --viewport
case $P in
  hero)
    node render.mjs --out $R/fold --widths 1440,390
    node render.mjs --out $R/film --selector "$SEL" --widths 1440 --frames 6 --interval 400
    node render.mjs --out $R --widths 1440 --press 'Create a free account' ;;
  final)
    node render.mjs --out $R/film --selector "$SEL" --widths 1440 --frames 6 --interval 1200 --scrollthrough
    node render.mjs --out $OUT/review/page/r$N --widths 1440,390 --full --scrollthrough ;;
  why)
    node render.mjs --out $R/film --selector "$SEL section" --widths 1440 --frames 5 --interval 800 --scrollthrough ;;
esac

# Blind folders: ours goes to A or B at random; the key stays out of critics' view.
D=$OUT/blind/$P/r$N; rm -rf $D; mkdir -p $D/A $D/B
if [ $((RANDOM % 2)) -eq 0 ]; then OURS=A; REF=B; else OURS=B; REF=A; fi
if [ $P = hero ]; then
  node render.mjs --out $R/prod --widths 1440,390 --prod
  cp $R/prod/1440-light.png $D/$OURS/desktop.png; cp $R/prod/390-light.png $D/$OURS/phone.png
elif [ $P = final ]; then
  node render.mjs --out $R/prod --selector "$SEL" --widths 1440,390 --scrollthrough --prod
  cp $R/prod/1440-light.png $D/$OURS/desktop.png; cp $R/prod/390-light.png $D/$OURS/phone.png
else
  cp $R/1440-light.png $D/$OURS/desktop.png; cp $R/390-light.png $D/$OURS/phone.png
fi
case $P in
  hero) cp $S/ref/duo-desktop-fold.jpg $D/$REF/desktop.jpg; cp $S/ref/duo-mobile-fold.jpg $D/$REF/phone.jpg ;;
  how) cp $S/ref/duo-s1-feature.jpg $D/$REF/desktop.jpg; cp $S/ref/duo-mobile-free__fun__effective.jpg $D/$REF/phone.jpg ;;
  why) cp $S/ref/duo-s1-feature.jpg $D/$REF/desktop-1.jpg; cp $S/ref/duo-s2-anywhere.jpg $D/$REF/desktop-2.jpg; cp $S/ref/duo-mobile-stay_motivated.jpg $D/$REF/phone.jpg ;;
  final) cp $S/ref/duo-s4-final.jpg $D/$REF/desktop.jpg; cp $S/ref/duo-mobile-learn_a_language_wit.jpg $D/$REF/phone.jpg ;;
esac
echo "$P r$N ours=$OURS" >> $OUT/blind-key.txt
echo "done: $P r$N (key recorded)"
