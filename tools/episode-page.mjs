/* The episode player, and the three cuts of it that are up for approval.

   All three play the same story with the same player. What differs is only where the
   title sequence sits relative to the content, which is the decision that actually
   has to be made once and then holds for every episode in the series:

     A  titles first      the full 61s sequence, then the episode. Cinematic, and a
                          minute of titles before content on every single episode.
     B  cold open         the hero and the map play first, the titles fire on the line
                          that states the premise, then the story resumes. Standard
                          episodic television, and it earns the titles.
     C  series stinger    a 15s cut of the sequence built from the opening beat and
                          *this episode's own era*, then straight into the story. The
                          titles change per episode and never outstay.

   The player is one file for all three: the cut is data.
*/

/**
 * The panels a cut opens on, before the titles.
 *
 * `openMode: 'first'` takes the first id that exists, so a cut can prefer the channel's own
 * authored hook and fall back to the story's cover when no hook has been written. Anything
 * else takes every id that exists, in order — cut B's two-panel cold open.
 *
 * One copy, because the same expression had been written out in the page, the packaging,
 * the publisher and the scorer, and they only have to disagree once to time every chapter
 * in a video wrongly.
 */
export function openIds(panels, cut) {
  const have = new Set(panels.map((p) => p.id));
  const want = (cut.open || []).filter((id) => have.has(id));
  return cut.openMode === 'first' ? want.slice(0, 1) : want;
}

/** Indices of those panels, for callers that reorder by position. */
export function openIndices(panels, cut) {
  const ids = openIds(panels, cut);
  return ids.map((id) => panels.findIndex((p) => p.id === id));
}

export const CUTS = [  {
    id: 'cut-a-titles',
    name: 'A · Titles first',
    pitch: 'The full 61-second sequence, an episode card, then the story. The most cinematic '
      + 'opening and the most expensive: a minute of titles before any content, every episode.',
    intro: { src: '../../../dist/v5-empires-mobile.mp4' },
    open: [], card: true, frame: 'bleed',
  },
  {
    id: 'cut-b-cold-open',
    name: 'B · Cold open, then titles',
    pitch: 'The hero and the map play first — about forty seconds that state who this is and '
      + 'what he claimed — then the titles fire and the story resumes. Standard episodic '
      + 'television: the titles arrive once you already care.',
    intro: { src: '../../../dist/v5-empires-mobile.mp4' },
    open: ['intro_hero', 'intro_map'], card: true, frame: 'bleed',
  },
  {
    id: 'cut-c-stinger',
    name: 'C · Series stinger',
    pitch: 'A fifteen-second cut of the sequence — the opening beat, then this episode\'s own '
      + 'era — and straight into the story. The titles change per episode, so they stay '
      + 'meaningful, and they never outstay their welcome.',
    intro: { src: '../../../dist/v6-episode-titles.mp4' },
    open: [], card: false, frame: 'bleed',
  },
  /* Built against YouTube's own numbers rather than taste. YouTube Analytics defines the
     "intro" as the first 30 seconds and calls retention there "above typical" only above
     50%; its stated advice when that number is low is to change the first 30 seconds. So
     the hook lands first, the titles are the 15s cut and are *over* by ~27s, and the story
     resumes inside the window YouTube is measuring. */
  {
    id: 'cut-d-youtube',
    name: 'D · YouTube cut',
    pitch: 'The claim first — "499 CE, a young Aryabhata dares to say: the Earth turns" — then '
      + 'the 15-second titles, then the story, with the titles finished by about 27 seconds. '
      + 'Built around YouTube measuring retention at the 30-second mark.',
    intro: { src: '../../../dist/v6-episode-titles.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'bleed',
  },
  /* The art is composed square. Cover-cropping it to 16:9 throws away 44% of every panel,
     which is where the tops of heads and the objects on the desk live. This cut never crops:
     the whole panel sits in frame with the caption beside it, in the title sequence's own
     layout. Costs screen area, loses nothing. */
  {
    id: 'cut-e-framed',
    name: 'E · Framed, nothing cropped',
    pitch: 'The claim, the 15-second titles, then the story with every panel shown whole — '
      + 'the art beside the caption instead of cropped behind it. Nothing is ever cut off.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed', caption: 'settle',
  },

  /* ── caption experiments ───────────────────────────────────────────────
     Identical to cut E in every respect except how the caption behaves, so a comparison
     between them is a comparison of the treatment and nothing else.

     What holds attention on a phone is word-synchronised text with per-word motion. The
     treatments currently trending — neon fills, comic bursts, bouncing pop-ups — are
     Shorts-native and would wreck this brand, so the mechanic is borrowed and the
     aesthetic is not. */
  {
    id: 'cut-f-rise',
    name: 'F · Framed + rising words',
    pitch: 'Cut E, with each word lifting and brightening as it is spoken and settling '
      + 'behind the next. Per-word motion in the sequence\'s own register.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed', caption: 'rise',
  },
  {
    id: 'cut-g-focus',
    name: 'G · Framed + focus',
    pitch: 'Cut E, with everything but the live phrase dropped to near-nothing. The '
      + 'strongest attention treatment and the most opinionated — you cannot read ahead.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed', caption: 'focus',
  },
  {
    id: 'cut-h-card',
    name: 'H · Framed + word cards',
    pitch: 'Cut E, with the caption set large and short — the pop-up treatment that is '
      + 'everywhere on the platform, translated into this typeface. The biggest gamble.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed', caption: 'card',
  },
  /* The read point stops moving. In every other treatment the eye has to find the lit word
     and where it sits changes with every line; here the caption scrolls so the spoken word
     is always on the column's centre, and the column fades to nothing top and bottom.
     Words rise into focus, are said, and sink — an hourglass with the live word at the
     waist. Reading costs nothing, and the motion carries the attention instead. */
  {
    id: 'cut-i-flow',
    name: 'I · Framed + hourglass flow',
    pitch: 'Cut E, with the whole caption scrolling so the word being spoken always sits on '
      + 'the same centre line, fading out above and below. The eye never has to search.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed', caption: 'flow',
  },
  /* The picture cuts on the sentence as well as on the panel. The narration moves through
     three or four clauses while one image holds, and that — not the panel lengths, which are
     set by the narration and cannot be edited — is why the body feels slower than the intro.
     Each clause gets its own framing, cut hard on a boundary where a reader already takes a
     breath. Built on the flow caption because that is the strongest of the three. */
  {
    id: 'cut-j-shots',
    name: 'J · Flow + the picture cuts',
    pitch: 'Cut I, with each panel\'s picture cutting to a new framing on the clause '
      + 'boundaries — two or three shots per panel instead of one image held throughout.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed',
    caption: 'flow', shots: true,
  },
  /* The story is a book being read. Each panel is a leaf that lifts, turns over and falls
     away to reveal the next, with the sound of it — three noise layers rather than one, so it
     reads as paper rather than as a swoosh. The film then resolves into abstract ink, which is
     where the channel's title sequences live, so it ends by dissolving back into its own
     visual language instead of simply stopping. */
  {
    id: 'cut-k-page',
    name: 'K · The book, with v1 captions',
    pitch: 'The framed cut with v1\'s settled caption — the whole line present, the spoken word '
      + 'lit — and each panel turning like a leaf of an old book to reveal the next, sound '
      + 'included, closing on abstract ink rather than on the last picture.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['hook', 'cover'], openMode: 'first', card: false, frame: 'framed',
    /* Settle, not flow.

       Flow scrolls the whole caption so the spoken word stays on the centre line, which is
       a second thing moving in a frame whose picture is already turning over. Two competing
       motions read as instability rather than as either effect. The settled caption holds
       still and lights word by word, so the only thing travelling is the page. */
    caption: 'settle', pageTurn: true,
  },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const episodePage = (ep, cut) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(ep.title)} — ${esc(cut.name)}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../../../vendor/fonts/fonts.css">
<style>
  :root{
    --paper:#0d0b09; --ink:#e8b64a; --ink-hi:#f6dc9a; --saffron:#e07b2a;
    --dim:#b7a684; --faint:rgba(183,166,132,.42);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#000;color:var(--dim);
    font-family:"Marcellus",Georgia,serif;-webkit-font-smoothing:antialiased}
  body{display:grid;place-items:center;overflow:hidden}

  #stage{position:relative;width:min(100vw,177.78vh);aspect-ratio:16/9;
    overflow:hidden;background:var(--paper);isolation:isolate}

  /* picture — the intro film and the panel art share the frame */
  #film,#art{position:absolute;inset:0}
  #film{opacity:0;transition:opacity .5s linear;z-index:1}
  #film.on{opacity:1}
  #film video{width:100%;height:100%;object-fit:cover;display:block}

  /* the scene wrapper owns the cross-fade; the images inside it are always opaque */
  #art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    transform-origin:center}
  /* The panels are composed square. Cover-cropping one into 16:9 discards 44% of its
     height — which is exactly where heads and desks are. So instead of holding a fixed
     centre crop, the shot travels the full height of the image over the panel's own
     length: nothing in the frame is permanently unseen, and a still gains a move.
     object-position is animatable, which does this without touching layout. */
  @keyframes panDown{from{object-position:50% 4%;transform:scale(1.015)}
                     to{object-position:50% 96%;transform:scale(1.075)}}
  @keyframes panUp{from{object-position:50% 96%;transform:scale(1.075)}
                   to{object-position:50% 4%;transform:scale(1.015)}}
  #art .scene.on img.pan-down{animation:panDown linear forwards}
  #art .scene.on img.pan-up{animation:panUp linear forwards}

  /* framed: never crop. The whole panel sits right of centre and the caption takes the
     column beside it — the title sequence's own layout, applied to the story. */
  .framed #art .scene{left:0}
  .framed #art img{object-fit:contain;object-position:50% 50%}
  /* panDown/panUp travel object-position, which does nothing once the picture is
     contained — there is no slack to travel through. Without a replacement the framed
     cut is five minutes of stills, so the picture breathes instead: the panel pushes
     3% over its own length while the blurred surround drifts the other way. Alternate
     panels invert, so twenty-eight of them never fall into a rhythm. */
  @keyframes framedIn{from{transform:scale(1)}to{transform:scale(1.034)}}
  @keyframes framedOut{from{transform:scale(1.034)}to{transform:scale(1)}}
  @keyframes plateDrift{from{transform:scale(1.18) translate(0,0)}
                        to{transform:scale(1.27) translate(-1.6%,.8%)}}
  .framed #art .scene.on img.sharp.pan-down{animation:framedIn linear forwards}
  .framed #art .scene.on img.sharp.pan-up{animation:framedOut linear forwards}
  .framed #art .scene.on img.plate{animation:plateDrift linear forwards}
  .framed #art .scene.on img.bg,.framed #art .scene.on img.char{animation:none}

  .framed #capwrap{right:auto;width:38%;bottom:auto;top:0;height:100%;padding:0 3.2% 0 5%;
    display:grid;align-content:center;background:none}
  /* Larger than the bled cut's, not smaller. Contain-fitting frees the width the caption
     used to share with the picture, and burnt-in text on a phone needs to clear about
     3.5% of frame height to stay readable — 29px in a 1080 frame did not. */
  .framed #cap{text-align:left;max-width:none;font-size:clamp(15px,2.34vw,44px);line-height:1.42}
  .framed #speaker{text-align:left;margin-left:0;font-size:clamp(10px,1.02vw,19px)}

  /* Contain-fitting a square panel into 16:9 leaves a third of the frame empty, and
     empty reads as unfinished. The same picture, blown up, blurred and pushed down to
     near-black, fills it: the frame is complete, the panel's own colour bleeds into the
     surround, and not one pixel of the art has been cropped to get there. */
  #art img.plate{display:none}
  .framed #art img.plate{display:block;object-fit:cover;transform:scale(1.18);
    filter:blur(42px) saturate(.62) brightness(.30);z-index:0}
  .framed #art img.sharp{left:38%;width:62%;z-index:3}
  .framed #art .scene::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
    background:radial-gradient(ellipse at 68% 50%,rgba(6,5,4,0) 30%,rgba(6,5,4,.58) 100%)}
  .framed #art .scene::before{content:"";position:absolute;left:24%;top:0;bottom:0;width:24%;
    z-index:2;pointer-events:none;
    background:linear-gradient(90deg,rgba(13,11,9,1) 0%,rgba(13,11,9,.74) 46%,rgba(13,11,9,0) 100%)}

  /* Export mode. A master carries the picture and nothing else — no buttons, no cut
     label, no progress bar, and no intro <video>, because the titles are composited
     from the real master file rather than screen-grabbed through a page. */
  html.export #chrome,html.export #start,html.export #bar,
  html.export #cut,html.export #film{display:none!important}
  html.export,html.export body{cursor:none}

  /* the four panels that are not plain pictures */
  #art .scene{position:absolute;inset:0;opacity:0;transition:opacity .9s ease}
  #art .scene.on{opacity:1}
  /* The pin's coordinates are fractions of the picture, so they have to be measured
     against the picture's box and not the frame's — in the framed cut those are not the
     same rectangle. The box also lifts the pin above the artwork's own stacking level. */
  .scene .pinbox{position:absolute;inset:0;z-index:4;pointer-events:none}
  .framed #art .scene .pinbox{left:38%;width:62%}
  .scene .pin{position:absolute;width:1.5vw;height:1.5vw;min-width:12px;min-height:12px;
    border-radius:50%;background:var(--saffron);transform:translate(-50%,-50%);
    box-shadow:0 0 0 0 rgba(224,123,42,.7);animation:ping 2.1s ease-out infinite}
  @keyframes ping{0%{box-shadow:0 0 0 0 rgba(224,123,42,.65)}100%{box-shadow:0 0 0 3.2vw rgba(224,123,42,0)}}
  .scene .pinlabel{position:absolute;transform:translate(-50%,14px);white-space:nowrap;
    font-size:clamp(9px,1vw,17px);letter-spacing:.24em;text-transform:uppercase;
    color:var(--ink-hi);background:rgba(6,5,4,.72);padding:.45em .9em;border-radius:2px;
    border:1px solid rgba(232,182,74,.28)}
  @keyframes bgmove{from{transform:scale(1) translateX(0)}to{transform:scale(var(--z,1.12)) translateX(var(--pan,-6%))}}
  .scene img.bg{animation:bgmove linear forwards}
  @keyframes charmove{
    from{transform:translateX(var(--fx,0%)) scale(var(--fs,.85)) rotate(var(--fr,0deg))}
    to{transform:translateX(var(--tx,0%)) scale(var(--ts2,1.03)) rotate(var(--tr,0deg))}}
  .scene img.char{object-fit:contain;animation:charmove linear forwards;
    filter:drop-shadow(0 18px 34px rgba(0,0,0,.72))}
  /* A split panel is three pictures side by side. Unlike every other kind it has no plate, so
     nothing was holding it to the recto: it was the one panel that bled across the crease and
     sat under the caption in the framed cut, and in the page-turn cut it was the one panel
     that turned wrongly — the leaf hinges at 38%, and the third of the picture lying to the
     left of the hinge swings backwards while the rest swings forward.

     The row is a box inside the scene rather than the scene itself, so the scene stays the
     full-frame rectangle every other kind is and the hinge, the paper and the backface rules
     all keep working off one geometry. */
  .scene.split .splitrow{position:absolute;inset:0;display:flex;gap:2px}
  /* In the framed cut nothing is cropped, so a square slice letterboxes inside a column that
     is nearly three times as tall as it is wide and two thirds of the page is empty. The row
     is therefore sized to its own slices — n columns of square art is an n:1 band — and
     centred, with the blurred plate behind it doing what it does on every other panel. */
  .framed #art .scene.split .splitrow{left:38%;width:62%;top:50%;bottom:auto;
    transform:translateY(-50%)}
  .scene.split .sl{position:relative;flex:1;overflow:hidden}
  .scene.split .sl img{position:absolute;inset:0;opacity:1;transition:none}
  .scene.split .sl b{position:absolute;left:6%;right:6%;bottom:34%;z-index:2;display:block;
    font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;
    font-size:clamp(11px,1.35vw,24px);line-height:1.3;color:var(--ink-hi);
    text-shadow:0 2px 16px #000;text-align:center}
  .scene.split .sl::after{content:"";position:absolute;inset:0;z-index:1;
    background:linear-gradient(0deg,rgba(6,5,4,.9) 0%,rgba(6,5,4,.55) 44%,rgba(6,5,4,0) 74%)}

  /* the caption sits in a band that is dark enough to hold text over any art */
  #capwrap{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:0 7.4% 5.6%;
    background:linear-gradient(0deg,rgba(6,5,4,.93) 0%,rgba(6,5,4,.82) 42%,rgba(6,5,4,.42) 72%,rgba(6,5,4,0) 100%);
    padding-top:9%;pointer-events:none}
  #cap{max-width:64ch;margin:0 auto;text-align:center;
    font-family:"Cormorant Garamond",Georgia,serif;
    font-size:clamp(15px,2.05vw,37px);line-height:1.38;color:rgba(183,166,132,.55)}
  #cap.speech{font-style:italic;color:rgba(232,182,74,.5)}
  #cap .w{transition:color .18s linear,text-shadow .18s linear}
  #cap .w.said{color:var(--ink-hi)}
  #cap .w.now{color:#fff;text-shadow:0 0 18px rgba(232,182,74,.55)}
  #cap.plain{color:var(--ink-hi)}

  /* ── caption treatments ────────────────────────────────────────────────
     What actually holds attention on a phone in 2026 is word-synchronised text with
     per-word motion. The styles trending on the platform — neon fills, comic bursts,
     bouncing pop-ups — are Shorts-native and would destroy this brand on contact, so what
     is borrowed is the *mechanic* (sync, contrast, motion per word) and not the aesthetic.
     Same typeface, same two colours, in every treatment.

     A treatment is chosen per cut, so two versions of an episode can differ by exactly
     this and nothing else — which is the only way to learn which one works. */

  /* rise — each word lifts and brightens as it is spoken, then settles.
     The kinetic mechanic in a refined register: motion the eye tracks, not motion that
     performs. The lift is 0.14em rather than a fixed pixel value so it scales with the
     type and reads the same on a phone as on a desktop. */
  .cap-rise #cap .w{display:inline-block;transition:color .16s linear,transform .22s cubic-bezier(.2,.9,.3,1),text-shadow .16s linear}
  .cap-rise #cap .w.now{transform:translateY(-0.14em)}
  .cap-rise #cap .w.said{transform:translateY(0)}

  /* focus — everything except the live phrase falls back to near-nothing.
     The strongest attention treatment and the most opinionated: it removes the ability to
     read ahead, which is exactly why it holds. Words already said stay faintly visible so
     the line still reads as a sentence rather than as flashcards. */
  .cap-focus #cap{color:rgba(183,166,132,.16)}
  .cap-focus #cap .w{transition:color .2s linear,opacity .2s linear,text-shadow .2s linear}
  .cap-focus #cap .w.said{color:rgba(183,166,132,.4)}
  .cap-focus #cap .w.now{color:#fff;text-shadow:0 0 26px rgba(232,182,74,.75)}

  /* card — the pop-up treatment, translated. One short phrase at a time, large and centred,
     instead of a running line. Chunking is done in the player on punctuation first and
     length second, because a phrase that breaks mid-clause reads as a stutter.

     The biggest departure and the biggest gamble: it carries the least text per second, so
     it lives or dies on the phrasing. Words outside the live phrase are not merely dimmed
     but removed from the flow, or the block still reads as a wall. */
  .cap-card #capwrap{padding-top:14%}
  /* ...but not in the framed cut, where #capwrap is already a full-height centred grid.
     There the padding is pure offset: it pushed the card to about 57% of frame height
     while every other treatment sat on the optical centre, so the two versions differed
     by vertical position as well as by caption — which is exactly the confound the
     experiment exists to avoid. */
  .cap-card .framed #capwrap{padding-top:0}
  .cap-card #cap{font-size:clamp(22px,3.4vw,64px);line-height:1.14;max-width:18ch;
    min-height:2.3em;display:flex;flex-wrap:wrap;gap:0 .28em;align-content:center;
    justify-content:center;color:rgba(183,166,132,.34)}
  .cap-card #cap .w{display:none;transition:color .14s linear,transform .2s cubic-bezier(.2,.9,.3,1)}
  .cap-card #cap .w.inchunk{display:inline-block}
  .cap-card #cap .w.inchunk.said{color:rgba(232,182,74,.6)}
  .cap-card #cap .w.now{color:#fff;transform:scale(1.05);text-shadow:0 0 30px rgba(232,182,74,.6)}
  /* "framed" is a class on #stage and "cap-card" is on the root element, so this is a
     descendant relationship, not a compound one. Written as a compound selector it
     silently matched nothing and the card sat centred inside a left-aligned column. */
  .cap-card .framed #cap{justify-content:flex-start;text-align:left}

  /* stroke — a gold rule travels under the live word.
     Adds a moving element without moving the type, which keeps long lines readable while
     still giving the eye something that changes every few hundred milliseconds. */
  /* flow — the read point never moves.

     The whole caption is scrolled so that the word being spoken sits on the column's
     optical centre, and the column is masked to nothing at its top and bottom edges. Words
     rise into focus, are said, and sink out: an hourglass with the live word at the waist.

     Why it should hold attention better than the others: in every treatment so far the eye
     has to *find* the lit word, and where it is changes with the line. Here it is always in
     the same place, so reading costs nothing and the movement is doing the work instead.

     The transform is a pure function of which word is live, and the transition is disabled
     in export — a time-based CSS animation cannot be scrubbed frame-accurately, so the
     master and the player would disagree by however long the ease had left to run. */
  .cap-flow #capwrap{
    -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.35) 18%,#000 40%,#000 60%,rgba(0,0,0,.35) 82%,transparent 100%);
    mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.35) 18%,#000 40%,#000 60%,rgba(0,0,0,.35) 82%,transparent 100%)}
  /* The caption is anchored to the top of the column and then scrolled down, rather than
     centred by the grid and scrolled from there. Both would look centred at rest, but a
     span's offsetTop is measured from its offsetParent, and with the grid doing the
     centring that parent is the stage — so the measured position carried the grid's own
     offset and the live word settled about a quarter of a frame below the centre line.
     position:relative on #cap makes the spans measure from the caption itself. */
  .cap-flow #capwrap{align-content:start}
  .cap-flow #cap{position:relative;transition:transform .3s cubic-bezier(.22,1,.36,1);
    will-change:transform;color:rgba(183,166,132,.26);line-height:1.62}
  .cap-flow #cap .w{display:inline-block;
    transition:color .18s linear,opacity .18s linear,transform .28s cubic-bezier(.2,.9,.3,1),text-shadow .18s linear}
  .cap-flow #cap .w.said{color:rgba(232,182,74,.42)}
  .cap-flow #cap .w.now{color:#fff;transform:scale(1.06);text-shadow:0 0 30px rgba(232,182,74,.7)}
  /* Both "export" and "cap-flow" are classes on the root element, so this is a compound
     selector. Written with a space it would be looking for a .cap-flow *inside* an
     exporting document, match nothing, and leave the transition running under the frame
     capture — which is the same specificity mistake that once left a caption uncentred. */
  html.export.cap-flow #cap,html.export.cap-flow #cap .w{transition:none}
  .cap-flow #speaker{opacity:0!important}

  /* shots — the picture cuts on the sentence.

     A hard cut, not a dissolve: a dissolve reads as the same shot changing its mind, and the
     whole point is a second visual event. The blurred plate underneath does not move, so the
     frame stays filled and only the picture in it changes.

     transform-origin does the framing. Scaling a contained image about a corner moves the
     eye into that part of the picture, which is what a cut-in is; scaling about the centre
     just makes everything bigger. */
  .scene .shotbox{position:absolute;inset:0;transition:none}
  .scene.shot-in .shotbox{transform:scale(1.34);transform-origin:52% 34%}
  .scene.shot-side .shotbox{transform:scale(1.22);transform-origin:22% 62%}

  /* page turn — the frame is an open book.

     The caption column is the left leaf, the picture is the right leaf, and the crease runs
     between them at 38% — which is exactly where #capwrap ends and img.sharp begins. When the
     story moves on, the picture page lifts off the right leaf, sweeps across the crease and
     closes over the words; the new words then appear on the leaf it has landed on.

     The hinge is therefore at 38%, not at the frame's left edge. Hinged at the edge the page
     rotated away from the words instead of over them, which is a rotating rectangle rather
     than a book.

     The leaf is wider than the left page it lands on, so past about 150 degrees it reaches
     beyond the frame. #stage already clips, so the overhang goes off-screen rather than being
     scaled to fit — a page that shrinks as it turns is the other way this effect gives itself
     away.

     Angle, lift and shadow are all set from JS as a function of time, because the renderer
     scrubs to arbitrary instants and a time-based ease cannot be scrubbed. */

  /* #art has to sit above the caption for any of this to work.

     #capwrap carries z-index 4 and #art carried none, so the leaf — z-index 6 inside a
     stacking context #art creates for itself the moment it is given a perspective — was
     still painted underneath the words. The page swept *below* the text it was supposed to
     be closing over, which was invisible only because the words had been blanked for the
     whole turn. Raising #art puts the leaf over the left page; the plate is pulled back to
     the recto below so the words are not buried by it at rest. */
  .page-turn #art{perspective:2200px;perspective-origin:38% 50%;z-index:5}
  .page-turn #film{z-index:6}
  /* The plate is the recto. Bleeding it across the whole frame made the left side a blurred
     blow-up of the picture, which is a background, not a page — and with #art now above the
     caption it would have covered the words outright. Held to the right of the crease it
     fills the printed page edge to edge, which is also what gives the leaf something to be:
     before this the thing that turned was a picture floating on black. */
  .page-turn #art img.plate{left:38%;width:62%}
  .page-turn #art .scene::after{left:38%}
  /* Pages are darker in the gutter. */
  .page-turn #art .scene::before{left:38%;width:auto;right:0;
    background:linear-gradient(90deg,rgba(13,11,9,.9) 0%,rgba(13,11,9,0) 11%)}
  /* The verso. Lit exactly as the leaf's own back is lit, because that is what it becomes:
     the page lands, dissolves into this, and if the two disagree about where the light
     falls the handover is a visible shift rather than nothing at all. A landed page is
     brightest away from the spine and darkest in the gutter, which is also the way round a
     real one is lit — the first version had it backwards, brightening toward the crease.

     The numbers are the leaf's own, re-expressed against a narrower box: the leaf is 62% of
     the frame wide and lands mirrored on a 38% page, so its 22% falls at 64% here and its
     120% radius at 196%. */
  .page-turn #stage::before{content:"";position:absolute;left:0;top:0;bottom:0;width:38%;
    pointer-events:none;
    background:
      radial-gradient(196% 100% at 64% 44%,rgba(240,224,192,.30),rgba(126,102,68,.13) 44%,rgba(20,15,10,0) 100%),
      linear-gradient(270deg,rgba(0,0,0,.66) 0%,rgba(0,0,0,0) 21%)}
  /* preserve-3d, not backface-visibility, on the leaf itself.

     Hiding the container's back face hid *everything inside it* the moment the turn passed
     ninety degrees — including the paper reverse, which is the one thing that is supposed to
     appear at exactly that point. The container stays visible and keeps its own 3D space; the
     picture layers hide their backs, and the paper hides its front, so the two swap over at
     the halfway mark the way the two sides of a sheet do. */
  .page-turn #art .scene{transform-origin:38% 50%;transform-style:preserve-3d}
  .page-turn #art .scene.turning{
    transform:translateZ(var(--lift,0px)) rotateY(var(--turn,0deg));
    opacity:var(--leaf,1);transition:none;
    z-index:6}
  /* Every direct child of the leaf, not the images.

     .shotbox is a plain div with no transform-style of its own, so it flattens everything
     under it: the sharp picture's hidden back face was being decided in the shotbox's own
     plane, which never rotates and therefore always faces the viewer. Past ninety degrees
     the leaf went on showing the picture — mirrored, place-name and all — instead of its
     reverse. The rule belongs on whatever sits directly in the leaf's 3D space.

     And it is not trusted on its own. With the rule in the right place the picture still
     came back for the frames the page lay flat at a hundred and eighty degrees, whatever
     depth the paper was given; which face a flattened subtree presents at the exact
     half-turn is not something to stake the shot on. --face switches the two sides at the
     midpoint from the clock instead, where the leaf is edge-on and neither can be seen. */
  .page-turn #art .scene.turning > *{backface-visibility:hidden;opacity:var(--face,1)}
  .page-turn #art .scene.turning::after{backface-visibility:hidden;opacity:var(--face,1)}
  /* The reverse of the leaf: unprinted page. A page's back is not its front, and showing
     the picture mirrored is the tell.

     translateZ is *negative*, and it comes before the flip.

     The offset is written in the leaf's own space, and the leaf ends the turn rotated a
     hundred and eighty degrees — which reverses that space's z axis against the world. A
     positive offset, the one that means "in front" everywhere else, therefore put the paper
     two pixels *behind* the picture exactly where it had to be in front of it: at a hundred
     and eighty degrees Chromium resolves the degenerate backface test in favour of the
     front, and the whole mirrored map came back for the frames the page lay flat. Written
     after the flip instead of before it, the translate is applied in the already-reversed
     frame and lands in the same wrong place. This is the same mistake in three disguises.

     The light is at 22%, not 96%. The leaf lands flipped, so its far edge ends up off-frame
     to the left and only its first sixty-one per cent is ever seen — with the sheen at the
     far end, every frame of the second half of the turn was an unlit black rectangle, which
     is to say the turn was visible for only half its length for the second time. The gutter
     shadow runs the same way round for the same reason.

     And it is opaque. Written as gradients alone it was a wash with a maximum alpha of .40,
     so the picture on the other side of the leaf showed straight through it. Paper is not
     translucent. */
  .page-turn #art .scene.turning::before{content:"";position:absolute;left:38%;right:0;top:0;bottom:0;
    z-index:9;transform:translateZ(-2px) rotateY(180deg);backface-visibility:hidden;
    opacity:calc(1 - var(--face,1));
    background:
      radial-gradient(120% 100% at 22% 44%,rgba(240,224,192,.30),rgba(126,102,68,.13) 44%,rgba(20,15,10,0) 100%),
      linear-gradient(90deg,rgba(0,0,0,.66) 0%,rgba(0,0,0,0) 13%),
      linear-gradient(180deg,var(--paper),var(--paper));
    box-shadow:0 0 80px 18px rgba(0,0,0,.6)}
  /* The crease. One soft dark seam where the two leaves meet, so the frame reads as a spread
     rather than as a caption beside a picture. Above #art, because the plate now runs right
     up to it and would otherwise cover the half of the seam that falls on the recto. */
  .page-turn #stage::after{content:"";position:absolute;left:38%;top:0;bottom:0;width:2.2%;
    transform:translateX(-50%);z-index:5;pointer-events:none;
    background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.55) 46%,rgba(0,0,0,.55) 54%,rgba(0,0,0,0));
    mix-blend-mode:multiply}
  /* The shadow the travelling leaf throws on the words it is closing over. */
  .page-turn #capwrap{position:absolute}
  .page-turn #capwrap::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;
    background:linear-gradient(270deg,rgba(0,0,0,.8) 0%,rgba(0,0,0,.4) 34%,rgba(0,0,0,0) 76%);
    opacity:var(--shade,0)}
  /* The new words are not there until the page that carries them has landed. */
  .page-turn #cap,.page-turn #speaker{opacity:var(--reveal,1)}

  .cap-stroke #cap .w{position:relative}  .cap-stroke #cap .w.now::after{content:"";position:absolute;left:0;right:0;bottom:-0.16em;    height:2px;background:linear-gradient(90deg,rgba(232,182,74,0),#e8b64a,rgba(232,182,74,0))}
  #speaker{margin:0 auto .5em;text-align:center;font-family:"Marcellus",serif;
    font-size:clamp(9px,.86vw,15px);letter-spacing:.34em;text-transform:uppercase;
    color:var(--saffron);opacity:0}
  #speaker.on{opacity:1}

  /* episode card */
  #card{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;
    background:var(--paper);opacity:0;transition:opacity .8s ease;pointer-events:none}
  #card.on{opacity:1}
  .card-num{font-size:clamp(9px,.8vw,14px);letter-spacing:.5em;color:var(--saffron);margin-bottom:1.6em}
  .card-hi{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(26px,3.5vw,64px);
    line-height:1.18;color:var(--ink-hi)}
  .card-en{margin-top:.5em;font-size:clamp(13px,1.5vw,27px);letter-spacing:.3em;color:var(--dim)}
  .card-era{margin-top:1.4em;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;
    font-size:clamp(12px,1.25vw,22px);color:var(--dim);opacity:.85}

  /* brand finish, carried over from the title sequence so the join is invisible */
  #vig{position:absolute;inset:0;pointer-events:none;z-index:6;
    box-shadow:inset 0 0 190px 70px rgba(0,0,0,.72)}
  #grain{position:absolute;inset:-8px;pointer-events:none;z-index:7;opacity:.075;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
    background-size:320px 320px}

  /* chrome */
  #bar{position:absolute;left:0;right:0;bottom:0;height:3px;z-index:8;background:rgba(232,182,74,.14)}
  #bar i{display:block;height:100%;width:0;background:var(--ink);transition:width .2s linear}
  #chrome{position:absolute;left:0;right:0;top:0;z-index:9;display:flex;align-items:center;gap:9px;
    padding:14px 18px;opacity:0;transition:opacity .25s ease}
  #stage:hover #chrome,#chrome.show{opacity:1}
  #chrome button{cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:.2em;
    text-transform:uppercase;color:var(--dim);background:rgba(6,5,4,.62);
    border:1px solid rgba(183,166,132,.28);border-radius:2px;padding:6px 12px}
  #chrome button:hover{color:var(--ink-hi);border-color:rgba(232,182,74,.6)}
  #chrome button.act{color:var(--paper);background:var(--ink);border-color:var(--ink)}
  #where{margin-left:auto;font-size:11px;letter-spacing:.16em;color:var(--dim);
    background:rgba(6,5,4,.62);padding:6px 11px;border-radius:2px}
  #cut{position:absolute;left:18px;bottom:16px;z-index:9;font-size:10.5px;letter-spacing:.26em;
    text-transform:uppercase;color:rgba(183,166,132,.5)}

  #start{position:absolute;inset:0;z-index:20;display:grid;place-content:center;gap:18px;
    background:rgba(6,5,4,.9);text-align:center;cursor:pointer}
  #start h1{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(24px,3.2vw,58px);
    color:var(--ink-hi);font-weight:400}
  #start p{font-size:clamp(11px,1.1vw,17px);letter-spacing:.28em;text-transform:uppercase;color:var(--dim)}
  #start span{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:clamp(13px,1.3vw,22px);
    color:var(--saffron);letter-spacing:.06em;text-transform:none}
  #start.gone{display:none}
  @media (prefers-reduced-motion:reduce){ #art img.on{animation:none} }
</style>
</head>
<body>
<div id="stage">
  <div id="art"></div>
  <div id="film"><video id="vid" src="${esc(cut.intro.src)}" playsinline preload="auto"></video></div>

  <div id="card">
    <div class="card-num">${esc(ep.era || '')}</div>
    <div class="card-hi">${esc(ep.title_i18n?.hi || ep.title)}</div>
    <div class="card-en">${esc(ep.title.toUpperCase())}</div>
    <div class="card-era">${esc(ep.hero?.legend || '')}</div>
  </div>

  <div id="capwrap">
    <div id="speaker"></div>
    <div id="cap"></div>
  </div>

  <div id="vig"></div><div id="grain"></div>
  <div id="bar"><i></i></div>
  <div id="cut">${esc(cut.name)}</div>

  <div id="chrome">
    <button id="pp">Pause</button>
    <button id="prev">Prev</button>
    <button id="next">Next</button>
    <button id="en" class="act">EN</button>
    <button id="hi">हिं</button>
    <button id="skip">Skip titles</button>
    <div id="where"></div>
  </div>

  <div id="start">
    <h1>${esc(ep.title_i18n?.hi || 'आर्यभट')}</h1>
    <p>${esc(ep.title)}</p>
    <span>${esc(cut.name)} — tap to begin</span>
  </div>
</div>

<script type="module">
const CUT = ${JSON.stringify({ intro: cut.intro, card: cut.card, open: openIds(ep.panels, cut), frame: cut.frame, caption: cut.caption || 'settle', shots: !!cut.shots, pageTurn: !!cut.pageTurn })};
const ep = await (await fetch('../episode.json')).json();
const P = ep.panels;
if (CUT.frame === 'framed') document.querySelector('#stage').classList.add('framed');
/* The caption treatment is a class on the root, so it can be swapped without touching the
   player: the word spans and their .now/.said classes are identical in every treatment and
   only their CSS differs. That is what makes two versions comparable — they differ by this
   and by nothing else. */
if (CUT.caption && CUT.caption !== 'settle') document.documentElement.classList.add('cap-' + CUT.caption);
const PAGETURN = !!CUT.pageTurn;
if (PAGETURN) document.documentElement.classList.add('page-turn');

/* The cut names which panels play before the titles; everything else follows in the
   source order. Expressing it as ids rather than a count means a cut can open on any
   panel — the YouTube cut opens on the claim, which is the third panel in the data. */
const openIdx = (CUT.open || []).map((id) => P.findIndex((p) => p.id === id)).filter((n) => n >= 0);
const restIdx = P.map((_, n) => n).filter((n) => !openIdx.includes(n));
const ORDER = [...openIdx, ...restIdx];

const $ = (s) => document.querySelector(s);
const art = $('#art'), film = $('#film'), vid = $('#vid'), card = $('#card');
const cap = $('#cap'), speaker = $('#speaker'), bar = $('#bar i'), where = $('#where');

let lang = 'en';
let i = -1;                 // current panel index
let audio = null;
let raf = 0;
let paused = false;
let introDone = false;

/* Preload the next panel's picture and sound while the current one plays, so a cut
   never waits on the network. Two ahead is enough and keeps memory flat. */
const cache = new Map();
function warm(n) {
  for (const k of ORDER.slice(n, n + 2)) {
    const p = P[k];
    if (!p || cache.has(p.id)) continue;
    const im = new Image(); if (p.art) im.src = p.art;
    const a = new Audio(); a.preload = 'auto';
    const src = p.audio[lang] || p.audio.en; if (src) a.src = src;
    cache.set(p.id, { im, a });
  }
}

/* Group the words of a line into short phrases.

   The "card" treatment shows one phrase at a time rather than a running line, which is the
   pop-up mechanic that is everywhere on the platform. Chunking on punctuation first and
   only then on length keeps the phrases readable — a chunk that breaks mid-clause reads as
   a stutter, which is worse than no chunking at all. */
function chunkWords(words, max) {
  const out = [];
  let cur = [];
  for (let k = 0; k < words.length; k++) {
    cur.push(k);
    const w = words[k][0];
    const ends = /[.,;:?!—]$/.test(w);
    if ((ends && cur.length >= 2) || cur.length >= max || k === words.length - 1) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  const of = new Array(words.length);
  out.forEach((g, ci) => g.forEach((k) => { of[k] = ci; }));
  return of;
}

let chunkOf = [];

/* The speaking character is named per episode, not per project. When this was the string
   "Aryabhata" every episode's dialogue was attributed to him. The episode's own figure is
   used instead; a story whose speaker is someone else falls back to the role. */
const SPEAKER = ep.figure || '';

function paintCaption(p) {
  cap.classList.toggle('speech', !!p.speech);
  /* The flow scroll belongs to the previous panel's line. Left alone it carries over, and
     the first word of a new caption appears already scrolled past. */
  cap.style.transform = '';
  speaker.textContent = p.speech ? (p.role === 'male' && SPEAKER ? SPEAKER : p.role) : '';
  speaker.classList.toggle('on', !!p.speech);
  // English has word timings, so the caption can track the voice; Hindi does not
  if (lang === 'en' && p.words.length) {
    cap.classList.remove('plain');
    chunkOf = CUT.caption === 'card' ? chunkWords(p.words, 5) : [];
    cap.innerHTML = p.words.map(([w], k) =>
      \`<span class="w" data-k="\${k}"\${chunkOf.length ? \` data-c="\${chunkOf[k]}"\` : ''}>\${w}</span>\`).join(' ');
  } else {
    cap.classList.add('plain');
    cap.textContent = p.text[lang] || p.text.en;
    chunkOf = [];
  }
}

/* The one place a caption's highlight state is decided.

   This used to exist twice — once for live playback and once for the frame-accurate export
   — and two copies of the rule that decides what the viewer sees is how the master and the
   player quietly stop agreeing. */
function paintWords(p, ms) {
  if (lang !== 'en' || !p.words.length) return;
  const spans = cap.children;
  let live = -1;
  for (let k = 0; k < p.words.length; k++) {
    const [, t, d] = p.words[k];
    const s = spans[k];
    if (!s) continue;
    const now = ms >= t && ms < t + d + 60;
    const said = ms >= t;
    if (now) live = k;
    if (s.classList.contains('now') !== now) s.classList.toggle('now', now);
    if (s.classList.contains('said') !== said) s.classList.toggle('said', said);
  }
  if (chunkOf.length) {
    /* Between words there is no live word, so the last one spoken decides the chunk —
       otherwise the card blinks out in every gap. */
    if (live < 0) for (let k = p.words.length - 1; k >= 0; k--) { if (ms >= p.words[k][1]) { live = k; break; } }
    const c = live >= 0 ? chunkOf[live] : 0;
    for (let k = 0; k < p.words.length; k++) {
      const s = spans[k];
      if (s) s.classList.toggle('inchunk', chunkOf[k] === c);
    }
    return;
  }

  /* flow — scroll the caption so the live word sits on the column's centre line.

     Held on the last spoken word between words, for the same reason the card is: the gaps
     between words are silence, not a reason for the whole block to jump back to the top. */
  if (CUT.caption === 'flow') {
    if (live < 0) for (let k = p.words.length - 1; k >= 0; k--) { if (ms >= p.words[k][1]) { live = k; break; } }
    const s = spans[live >= 0 ? live : 0];
    if (s) {
      /* offsetTop is relative to #cap, which is position:relative for exactly this reason.
         The column is the full height of the frame in the framed cut, so its midpoint is
         the optical centre the eye settles on. */
      const mid = s.offsetTop + s.offsetHeight / 2;
      const centre = cap.parentElement.clientHeight / 2;
      cap.style.transform = 'translateY(' + (centre - mid).toFixed(1) + 'px)';
    }
  }
}

/* Where a panel's picture cuts.

   A panel holds one image for twelve to fourteen seconds while the narration moves through
   three or four clauses. The words keep changing and the picture does not, which is the
   real reason the body feels slower than the intro — not the panel lengths, which are fixed
   by the narration and cannot be edited.

   The cut goes where the speaker breathes. The first version looked for punctuation and
   never fired once: the source narration is written without commas — twenty-six words, zero
   punctuation marks — so there were no clause boundaries to find. The *pauses* are there
   regardless of how the line was typed, and they are where a listener already segments the
   sentence, so a cut on one reads as punctuation rather than as an edit.

   Shots are at least MINSHOT seconds so nothing strobes, and a panel too short to hold two
   of them keeps one. Returns cut times in ms from the panel's start. */
const MINSHOT = 3.6;
function shotCuts(p) {
  const w = p.words || [];
  if (w.length < 6 || p.dur < MINSHOT * 2) return [];
  const lo = MINSHOT * 1000;
  const hi = p.dur * 1000 - MINSHOT * 1000;

  /* Every word start, with the silence in front of it. Sorted by that silence, so the
     longest breath in the line is the first candidate. */
  const cands = [];
  for (let k = 1; k < w.length; k++) {
    const t = w[k][1];
    if (t < lo || t > hi) continue;
    const gap = t - (w[k - 1][1] + w[k - 1][2]);
    /* Punctuation still counts when it is there — it is a stronger signal than a pause and
       costs nothing to prefer. */
    const bonus = /[.,;:?!\u2014]$/.test(w[k - 1][0]) ? 400 : 0;
    cands.push({ t, score: gap + bonus });
  }
  cands.sort((a, b) => b.score - a.score);

  const cuts = [];
  for (const c of cands) {
    if (cuts.every((t) => Math.abs(t - c.t) >= lo)) cuts.push(c.t);
    if (cuts.length >= 2) break;
  }
  return cuts.sort((a, b) => a - b);
}

/* The framings a shot can take. Shot 0 is always the whole picture, so a panel still opens
   on what it is; the later shots move in. In the framed cut the sharp layer is contained
   rather than filling the frame, so scaling it up crops *toward* the frame edge instead of
   past it — the move is into the picture, not off it. */
const SHOTS = ['', 'shot-in', 'shot-side'];

function paintShots(p, ms, scene) {
  if (!scene || !CUT.shots) return;
  const cuts = scene.__cuts || [];
  let s = 0;
  for (const c of cuts) if (ms >= c) s++;
  const cls = SHOTS[Math.min(s, SHOTS.length - 1)];
  if (scene.dataset.shot !== cls) {
    scene.dataset.shot = cls;
    for (const c of SHOTS) if (c) scene.classList.remove(c);
    if (cls) scene.classList.add(cls);
  }
}

function tick(p) {
  if (!audio) return;
  paintWords(p, audio.currentTime * 1000);
  paintShots(p, audio.currentTime * 1000, art.lastElementChild);
  const done = ORDER.slice(0, i).reduce((a, k) => a + P[k].dur, 0) + audio.currentTime;
  bar.style.width = (100 * done / ep.runtime).toFixed(2) + '%';
  raf = requestAnimationFrame(() => tick(p));
}

/* Build the picture for a panel. Most are one image with a slow push; four are not,
   and each of those gets what its data actually describes rather than a fallback. */
function buildScene(p, secs, pos) {
  const el = document.createElement('div');
  el.className = 'scene ' + p.kind;
  // alternate the travel direction so twenty-eight panels never feel mechanical
  const pan = pos % 2 === 0 ? 'pan-down' : 'pan-up';
  const img = (src, cls) => {
    const m = document.createElement('img');
    m.src = src; m.className = cls; m.style.animationDuration = secs + 's';
    return m;
  };
  /* In the framed cut a picture is two layers: a blurred blow-up that fills the frame
     and the untouched panel sitting on top of it. Everywhere else the plate is
     display:none, so this costs one cached decode and changes nothing. */
  const laid = (src, cls) => {
    el.appendChild(img(src, 'plate'));
    /* The sharp picture goes in a box of its own. The pan is a CSS animation on the image
       and it animates transform, so a running animation beats any plain transform
       declaration — a shot framing written on the image itself simply never applied.
       Transforming the box instead lets the two compose: the pan keeps drifting inside the
       shot, and the shot is what cuts. The blurred plate is left out of the box on purpose,
       so the frame stays filled while the picture in it changes. */
    const box = document.createElement('div');
    box.className = 'shotbox';
    box.appendChild(img(src, cls + ' sharp'));
    el.appendChild(box);
  };

  if (p.kind === 'map' && p.map) {
    laid(p.map, pan);
    const box = document.createElement('div');
    box.className = 'pinbox';
    const pin = document.createElement('i');
    pin.className = 'pin';
    pin.style.left = (p.pin.x * 100) + '%';
    pin.style.top = (p.pin.y * 100) + '%';
    box.appendChild(pin);
    if (p.pin.label) {
      const lb = document.createElement('div');
      lb.className = 'pinlabel';
      lb.style.left = (p.pin.x * 100) + '%';
      lb.style.top = (p.pin.y * 100) + '%';
      lb.textContent = p.pin.label;
      box.appendChild(lb);
    }
    el.appendChild(box);
    return el;
  }

  if (p.kind === 'action' && p.bg) {
    el.appendChild(img(p.bg, 'plate'));
    const b = img(p.bg, 'bg sharp');
    b.style.setProperty('--z', p.motion?.bgZoom ?? 1.12);
    b.style.setProperty('--pan', (p.motion?.bgPan ?? -6) + '%');
    el.appendChild(b);
    for (const c of (p.chars || [])) {
      if (!c.img) continue;
      const m = img(c.img, 'char sharp');
      const mo = c.motion || {};
      m.style.setProperty('--fx', (mo.fromX ?? 0) + '%');
      m.style.setProperty('--tx', (mo.toX ?? 0) + '%');
      m.style.setProperty('--fs', mo.fromScale ?? 0.85);
      m.style.setProperty('--ts2', mo.toScale ?? 1.03);
      m.style.setProperty('--fr', (mo.fromRot ?? mo.rotFrom ?? 0) + 'deg');
      m.style.setProperty('--tr', (mo.toRot ?? mo.rotTo ?? 0) + 'deg');
      el.appendChild(m);
    }
    return el;
  }

  if (p.kind === 'split' && p.slices?.length) {
    /* The plate a split panel never had. Every other kind fills the frame with a blurred
       blow-up of its own art; without one the split sat as a band on bare black, which is
       what made it look like a different film for four seconds. The first slice stands in
       for the panel, because there is no single image to take. */
    if (p.slices[0]?.img) el.appendChild(img(p.slices[0].img, 'plate'));
    const row = document.createElement('div');
    row.className = 'splitrow';
    /* The art is composed square, so n columns of it is an n:1 band. Written from the data
       rather than fixed at 3:1, because a two- or four-slice panel is legal. Concatenated
       rather than interpolated: this whole page is itself a template literal, and a nested
       one has to be escaped twice to survive it. */
    row.style.aspectRatio = p.slices.length + '/1';
    for (const s of p.slices) {
      const d = document.createElement('div');
      d.className = 'sl';
      if (s.img) { const m = document.createElement('img'); m.src = s.img; d.appendChild(m); }
      const b = document.createElement('b');
      b.textContent = s.slogan?.[lang] || s.slogan?.en || '';
      d.appendChild(b);
      row.appendChild(d);
    }
    el.appendChild(row);
    return el;
  }

  if (p.art) laid(p.art, pan);
  return el;
}

function show(n) {
  cancelAnimationFrame(raf);
  if (audio) { audio.pause(); audio = null; }
  if (n >= ORDER.length) return finish();
  i = n;
  const p = P[ORDER[n]];
  where.textContent = \`\${n + 1} / \${ORDER.length}\`;

  const scene = buildScene(p, Math.max(4, p.dur + 1.2), n);
  scene.__cuts = shotCuts(p);
  art.appendChild(scene);
  requestAnimationFrame(() => scene.classList.add('on'));
  setTimeout(() => { [...art.children].slice(0, -1).forEach((el) => el.remove()); }, 1000);

  paintCaption(p);
  capKey = p.id;
  const src = p.audio[lang] || p.audio.en;
  audio = new Audio(src);
  audio.play().catch(() => {});
  audio.onended = () => { if (!paused) show(i + 1); };
  warm(n + 1);
  tick(p);
}

function finish() {
  cancelAnimationFrame(raf);
  card.querySelector('.card-hi').textContent = ep.moral ? '' : '';
  card.querySelector('.card-num').textContent = 'THE MORAL';
  card.querySelector('.card-en').textContent = '';
  card.querySelector('.card-era').textContent = ep.moral || '';
  card.classList.add('on');
  bar.style.width = '100%';
}

async function playIntro() {
  film.classList.add('on');
  vid.currentTime = 0;
  try { await vid.play(); } catch { /* blocked until gesture */ }
  await new Promise((r) => {
    vid.onended = r;
    vid.onerror = r;
  });
  film.classList.remove('on');
  introDone = true;
  await new Promise((r) => setTimeout(r, 420));
}

async function showCard() {
  if (!CUT.card) return;
  card.classList.add('on');
  await new Promise((r) => setTimeout(r, 2600));
  card.classList.remove('on');
  await new Promise((r) => setTimeout(r, 700));
}

/* The cut is expressed as "how many panels play before the titles". Everything else
   about the three versions is identical, which is the point of comparing them. */
async function run() {
  const before = openIdx.length;
  if (before > 0) {
    await new Promise((resolve) => {
      let stop = false;
      const step = (n) => {
        if (stop) return;
        if (n >= before) { resolve(); return; }
        show(n);
        audio.onended = () => step(n + 1);
      };
      step(0);
      window.__abortColdOpen = () => { stop = true; resolve(); };
    });
    if (audio) { audio.pause(); audio = null; }
    cancelAnimationFrame(raf);
    [...art.children].forEach((el) => el.classList.remove('on'));
    await new Promise((r) => setTimeout(r, 600));
  }
  await playIntro();
  await showCard();
  show(before);
}

$('#pp').addEventListener('click', () => {
  paused = !paused;
  $('#pp').textContent = paused ? 'Play' : 'Pause';
  if (paused) { audio?.pause(); vid.pause(); }
  else { if (audio) { audio.play().catch(() => {}); } else if (!introDone) vid.play().catch(() => {}); }
});
$('#prev').addEventListener('click', () => show(Math.max(0, i - 1)));
$('#next').addEventListener('click', () => show(Math.min(P.length - 1, i + 1)));
$('#skip').addEventListener('click', () => {
  window.__abortColdOpen?.();
  vid.pause(); film.classList.remove('on'); introDone = true;
  vid.currentTime = 0; vid.onended = null;
  card.classList.remove('on');
  show(CUT.intro.before);
});
for (const L of ['en', 'hi']) {
  $('#' + L).addEventListener('click', () => {
    if (lang === L) return;
    lang = L;
    $('#en').classList.toggle('act', L === 'en');
    $('#hi').classList.toggle('act', L === 'hi');
    cache.clear();
    if (i >= 0) show(i);        // restart the panel in the new voice
  });
}

$('#start').addEventListener('click', () => {
  $('#start').classList.add('gone');
  $('#chrome').classList.add('show');
  setTimeout(() => $('#chrome').classList.remove('show'), 2600);
  warm(0);
  run();
}, { once: true });

/* ── export: the picture as a pure function of time ───────────────────────
   The live player is driven by <audio> events, which a headless browser cannot
   step frame by frame. So the export path never plays anything. Given t it works
   out which panel is on screen, rebuilds that panel only when it changes, and
   scrubs the CSS move to the exact instant with a negative animation-delay
   against a paused animation. Two consequences matter:

     the render is deterministic — same frames on any machine, none dropped
     the render cannot drift from the player — it *is* the player's own markup,
     its own keyframes and its own word timings, read at a different clock

   Panel durations come from the narration files, so picture and voice stay in
   sync by construction rather than by a number kept in step by hand. */
const EXPORT = new URLSearchParams(location.search).has('export');
if (EXPORT) document.documentElement.classList.add('export');

const DURATION = ORDER.reduce((a, k) => a + P[k].dur, 0);
let scrubbed = -1;
/* Which panel's words #capwrap is currently holding. Tracked separately from the panel on
   screen because during a page turn the two are deliberately different. */
let capKey = null;

function panelAt(t) {
  let acc = 0;
  for (let n = 0; n < ORDER.length; n++) {
    const d = P[ORDER[n]].dur;
    if (t < acc + d || n === ORDER.length - 1) {
      return { n, lt: Math.max(0, Math.min(d, t - acc)), d, start: acc };
    }
    acc += d;
  }
  return { n: 0, lt: 0, d: 0, start: 0 };
}

/* The page turn.

   The frame is an open book: words on the left leaf, picture on the right, crease between
   them. When the story moves on, the picture page lifts, sweeps across the crease, closes over
   the words, and the new words appear on the leaf it lands on.

   Three things are driven from here, all as pure functions of the panel-local time, because
   the renderer scrubs to arbitrary instants and a time-based CSS ease cannot be scrubbed —
   the master would land wherever the browser happened to be and disagree with the player.

     --turn    the angle, 0 to -180 about the crease
     --shade   the shadow the travelling leaf throws on the words it is closing over
     --reveal  the new words, which are not there until the page carrying them has landed */
const TURN = 1.25;
/* The settle. The leaf reaches the left page a fraction before the words do: it lies there
   for a beat and dissolves into the page while the new ink comes up through it. Removed on
   the frame it landed, it popped — its back carries a sheen and a drop shadow the bare page
   does not, so the page did not so much settle as disappear. */
const SETTLE = 0.22;

function paintTurn(lt, n) {
  if (!PAGETURN) return;
  const leaf = art.querySelector('.scene.turning');
  const wrap = document.getElementById('capwrap');
  const set = (el, k, v) => { if (el) el.style.setProperty(k, v); };
  if (n === 0 || lt >= TURN + SETTLE) {
    if (leaf) leaf.remove();
    set(wrap, '--shade', '0'); set(wrap, '--reveal', '1');
    return;
  }
  if (!leaf) return;

  const u = Math.max(0, Math.min(1, lt / TURN));
  /* Smoothstep, not ease-out.

     Ease-out puts almost all the rotation at the front: a fifth of the way through, the leaf
     was already at eighty-five degrees, which is edge-on and therefore invisible. The turn ran
     for nine hundred milliseconds and could only be seen for two hundred of them.

     Smoothstep reaches ninety degrees at the halfway point, so the face of the page is visible
     for the first half of the turn and its back for the second — which is what a page does,
     and what makes the motion legible at all. */
  const e = u * u * (3 - 2 * u);
  leaf.style.setProperty('--turn', (e * -180).toFixed(2) + 'deg');
  /* Which side of the sheet is facing us. Smoothstep is symmetric, so the leaf passes
     ninety degrees at exactly the halfway point — edge-on, projected to nothing, which is
     the one instant where the two faces can be exchanged without either being seen. */
  leaf.style.setProperty('--face', u < 0.5 ? '1' : '0');
  /* It lifts off the block before it travels and settles back as it lands. */
  leaf.style.setProperty('--lift', (Math.sin(u * Math.PI) * 34).toFixed(2) + 'px');

  const s = Math.max(0, (lt - TURN) / SETTLE);
  leaf.style.setProperty('--leaf', (1 - s).toFixed(3));
  if (!wrap) return;
  /* The shadow the page throws ahead of itself on the words it is closing over: it arrives
     with the leaf and stays until the leaf has gone. */
  set(wrap, '--shade', lt < TURN ? Math.min(1, u * 2.4).toFixed(3) : '0');
  /* Full through the turn, because until the leaf lands these are still the *old* words and
     they are what the page is closing over — blanking them at the start of the turn is what
     made the page come down on an empty leaf. They are swapped for the new ones underneath
     the landed page, and those come up through the settle. */
  set(wrap, '--reveal', lt < TURN ? '1' : Math.min(1, s).toFixed(3));
}

function seek(t) {
  const { n, lt, d } = panelAt(t);
  const p = P[ORDER[n]];

  if (n !== scrubbed) {
    scrubbed = n;
    i = n;
    cancelAnimationFrame(raf);
    /* The page turn needs the panel it is turning away from, so the outgoing scene is kept
       and re-parented rather than discarded. Everywhere else it is replaced as before —
       carrying a second scene around costs a decode for a cut that would never show it. */
    const prev = PAGETURN ? art.lastElementChild : null;
    art.replaceChildren();
    const scene = buildScene(p, Math.max(4, d + 1.2), n);
    scene.__cuts = shotCuts(p);
    scene.classList.add('on');              // no cross-fade to wait out when scrubbing
    art.appendChild(scene);
    if (prev && n > 0) { prev.classList.add('turning'); art.appendChild(prev); }
    where.textContent = \`\${n + 1} / \${ORDER.length}\`;
  }

  /* Which panel's words the left page is holding.

     Through a page turn the left page still belongs to the panel being turned away from:
     those are the words the leaf is closing over. Repainting the caption the moment the
     panel index changed swapped them in on the first frame of the turn and then hid them,
     so the page spent a second and a quarter closing over an empty leaf.

     Derived from the time rather than remembered, because the renderer scrubs to arbitrary
     instants and anything held in a variable would depend on how it got there. */
  const turning = PAGETURN && n > 0 && lt < TURN;
  const capP = turning ? P[ORDER[n - 1]] : p;
  if (capKey !== capP.id) { capKey = capP.id; paintCaption(capP); }

  const leafEl = art.querySelector('.scene.turning');
  for (const el of art.querySelectorAll('img')) {
    el.style.animationPlayState = 'paused';
    /* The leaf is still running the panel it came from, so it keeps that panel's clock.
       Given the new panel's local time it snapped back to the start of its own pan on the
       very frame it began to lift, which is a jump the eye catches even at a second and a
       quarter. */
    const local = leafEl && leafEl.contains(el) ? P[ORDER[n - 1]].dur + lt : lt;
    el.style.animationDelay = (-local).toFixed(3) + 's';
  }

  paintWords(capP, turning ? capP.dur * 1000 : lt * 1000);
  /* The shot is a pure function of the panel-local time, so scrubbing lands on exactly the
     framing the player would be showing. It is recomputed on every seek rather than only on
     a panel change, because a seek within one panel can cross a cut. */
  paintShots(p, lt * 1000, art.querySelector('.scene:not(.turning)'));
  paintTurn(lt, n);

  const done = ORDER.slice(0, n).reduce((a, k) => a + P[k].dur, 0) + lt;
  bar.style.width = (100 * done / ep.runtime).toFixed(2) + '%';
  return { panel: p.id, index: n, local: lt };
}

/** The schedule the renderer needs: where every panel starts, in the cut's order. */
function timeline() {
  let acc = 0;
  return ORDER.map((k) => {
    const p = P[k];
    const row = { id: p.id, start: +acc.toFixed(3), dur: p.dur, mood: p.mood || null, audio: p.audio };
    acc += p.dur;
    return row;
  });
}

// handle for QA and for the master renderer
window.__ep = {
  show, seek, panelAt, timeline,
  duration: DURATION,
  order: ORDER,
  get index() { return i; },
  panels: P,
  setLang(L) { lang = L; },
};
window.__epReady = true;
</script>
</body>
</html>
`;
