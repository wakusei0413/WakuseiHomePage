import { editableSiteConfig } from './customize';
import { parseSiteConfig } from './schema';

// Server-only: imported for its side effect by BaseLayout.astro (never by an
// island), so the zod schema runs at build/SSR time and never reaches the client.
// Throws with a readable list of issues when customize.ts is invalid.
parseSiteConfig(editableSiteConfig);
