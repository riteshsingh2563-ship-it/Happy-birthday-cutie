# Happy Birthday, Asmita ✨

A small, personal birthday surprise for **Asmita**, made by her old
friend **Ayush** — a warm, friendly, and respectful celebration. Nothing
romantic; just a beautiful moment to say *happy birthday* to someone
you've been friends with for years.

## The experience

A five-act flow with cinematic transitions:

1. **Live countdown** — “Something Special Is Waiting For You…” counts
   down to **15 November 2026** (days · hours · minutes · seconds).
2. **Preview** — press **Preview Birthday Surprise** (or open the page
   with `?preview=true`) for an animated **5 → 4 → 3 → 2 → 1**, a
   confetti celebration — *It’s 15 November! 🎉* — that flows straight
   into the surprise.
3. **The surprise** — an elegant gift card: **Open Surprise ✨**
   starts the music, the confetti and the reveal.
4. **Birthday reveal** — one of Asmita’s real photos, a soft glow,
   sparkles and a genuine birthday wish from Ayush.
5. **Memories** — a friendly photo gallery of her real photos
   (swipe, arrows, thumbnails): *“Nine years later, it’s still nice to
   celebrate a special day.”*
6. **Final wish** — “Once Again, Happy Birthday, Asmita! 🎉” with a
   **Replay Surprise** button to live the whole thing again.

## Run it

```bash
node server.js
# → http://localhost:4173
# → http://localhost:4173/?preview=true   (experience it right now)
```

Zero dependencies — just Node.js (18+). To change the port:
`PORT=8080 node server.js`.

The site is also plain static HTML/CSS/JS: you can open `index.html`
or host the folder on any static host and it will still work.

## The photos — real ones only

The site uses **only the four real photos of Asmita** from the Drive
folder *“Ayush Asmita”*. No image is generated, recreated, illustrated
or substituted, ever.

- While a local copy is missing, photos load straight from the public
  Drive links (the visitor's browser fetches them).
- When served with `node server.js`, the first browser visit quietly
  downloads the originals and saves them to `public/photos/`
  (end-point `POST /api/photos/:name`), so the site is fully local
  afterwards.
- To add them to the repo yourself, drop the files into
  `public/photos/` and remove the `public/photos/IMG-*.jpg` line from
  `.gitignore` before committing.

## The music

The site plays the song **Happy Birthday Pop** from
`/music/happy-birthday-pop.mp3` — place your file at
`public/music/happy-birthday-pop.mp3`. Music only starts after the
visitor taps **Open Surprise** (no autoplay), with a small
play/pause + mute control in the corner.

If the file is missing, nothing breaks: a soft, gentle built-in
music-box melody (the public-domain “Happy Birthday” tune, synthesized
in-browser with WebAudio) plays instead.

## Project structure

```
index.html            the whole experience (six scenes)
css/styles.css        design system & animations
js/main.js            flow: countdown, preview, scenes, gallery, photos
js/effects.js         ambient particles + confetti (canvas, no libraries)
js/music.js           MP3 playback + WebAudio fallback melody
server.js             zero-dependency static server + photo cache
public/photos/        Asmita's real photos (auto-cached / drop-in)
public/music/         happy-birthday-pop.mp3 (user-provided)
```

Made with care, for a great friend. ✦
