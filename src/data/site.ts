import { editableSiteConfig } from './customize';
import { parseSiteConfig } from './schema';

export const siteConfig = parseSiteConfig(editableSiteConfig);
