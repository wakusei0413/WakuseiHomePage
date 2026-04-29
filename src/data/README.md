# Data Editing Guide

Most homepage content is now edited in one place:

- `src/data/customize.ts`

What to change there:

- `profile`: avatar, display name, status text
- `socialLinks`: button names, URLs, icons, colors
- `slogans`: typewriter copy and timing
- `time`: 12h/24h display and date visibility
- `loading`: rotating loading texts
- `wallpaper`: image APIs and scroll behavior

Runtime exports:

- `src/data/site.ts`: validated config entry used by the app
- `src/data/schema.ts`: Zod schema validation
