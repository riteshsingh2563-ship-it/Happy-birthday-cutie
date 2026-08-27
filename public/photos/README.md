# Photos — Asmita (real, user-provided)

These are the four real photos of Asmita from the Drive folder
“Ayush Asmita” (shared with the user). No generated or substitute
images are ever used.

Files expected here:

- IMG-20260826-WA0003.jpg
- IMG-20260826-WA0004.jpg
- IMG-20260826-WA0006.jpg
- IMG-20260826-WA0007.jpg

How they get here:

1. Automatic (dev server): the first time the site is opened in a real
   browser while served by `node server.js`, the visitor's browser
   (which can reach Google Drive) downloads the originals and posts
   them to `/api/photos/...`; the server saves them in this folder.
2. Manual: simply drop the four files in here and restart the server.

While no local copy exists yet, the site displays the same real photos
directly from the public Drive links, so the experience always shows
the real photos.
