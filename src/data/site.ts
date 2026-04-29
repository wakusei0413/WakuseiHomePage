import { editableSiteConfig } from './customize';
import { parseSiteConfig } from './schema';

export { editableSiteConfig, quickEditSections } from './customize';

export const siteConfig = parseSiteConfig(editableSiteConfig);
