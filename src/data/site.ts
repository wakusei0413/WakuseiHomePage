import { editableSiteConfig } from './customize';

// Islands import this module too, so it must stay free of zod (~90 KB in the
// browser). The config is validated on the server instead — see
// ./validate-site-config.ts, imported by BaseLayout, which every page renders
// through — so a broken config still fails `astro dev` and `astro build`.
export const siteConfig = editableSiteConfig;
