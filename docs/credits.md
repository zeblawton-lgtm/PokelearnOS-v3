# Asset credits & licensing

## Music
Background music tracks under `artifacts/pokelearnos/public/audio/` were
supplied by the device owner for personal/home kiosk use. They are Nintendo
"Wii" channel/Sports/Fit/Play compositions and are **copyrighted by Nintendo**.

They are bundled here for a private, non-commercial, single-family device only.
Do **not** redistribute this build publicly or commercially with these tracks.
To ship publicly, replace the files in `public/audio/` with royalty-free music
of the same filenames (see `src/lib/music.ts` for the expected names) or remove
them — the app degrades gracefully (music simply won't play).

## Sprites
Pokémon sprites are © Nintendo / Game Freak / The Pokémon Company. The bundled
artwork is from community sprite sets supplied by the device owner and is used
for a private educational kiosk. The same redistribution caveat applies.

## Sound effects
All correct/incorrect/tap/fanfare cues are synthesised at runtime with the Web
Audio API (`src/lib/sound.ts`) — no third-party audio files, fully original.
