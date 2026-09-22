import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { siteConfig } from '../data/site';

/**
 * Build-time social card for every page that does not ship its own `og:image`
 * (home, archives, taxonomies, search, cover-less articles).
 *
 * Before this existed those pages fell back to `profile.avatar` — a square
 * image that every platform had to letterbox. Cropping the configured wallpaper
 * to the 1200x630 OG ratio instead gives a branded landscape card that follows
 * the user's own background, and it costs nothing at runtime because the file is
 * rendered once during the build.
 *
 * Deliberately raster-only: no text is drawn. Rendering CJK glyphs would depend
 * on system fonts being installed on the build machine (librsvg/Pango), which is
 * not true of a stock CI image, and silent tofu boxes are worse than a clean
 * photographic card.
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_MAX_HEIGHT = 320;

// `import.meta.url` points at the bundled server chunk during a static build,
// not at this source file, so anchor `public/` to the project root instead —
// `astro build` is always invoked from there (see the npm scripts).
const publicDir = path.resolve(process.cwd(), 'public');

function resolvePublicFile(reference: string | undefined): string | null {
    if (!reference || /^[a-z][a-z\d+.-]*:/i.test(reference)) return null;

    const absolute = path.resolve(publicDir, reference.replace(/^\/+/, ''));
    if (!absolute.startsWith(path.resolve(publicDir))) return null;
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;

    return absolute;
}

function encode(image: Sharp): Promise<Buffer> {
    return image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

function renderWallpaperCard(source: string): Promise<Buffer> {
    return encode(sharp(source).resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' }));
}

/** Flat brand-colour card with the avatar centred, used when no wallpaper exists. */
async function renderBrandCard(): Promise<Buffer> {
    const background = sharp({
        create: {
            width: OG_WIDTH,
            height: OG_HEIGHT,
            channels: 3,
            background: siteConfig.themeColor
        }
    });

    const logo = resolvePublicFile(siteConfig.profile.avatar);
    if (!logo) return encode(background);

    const logoBuffer = await sharp(logo).resize({ height: LOGO_MAX_HEIGHT, fit: 'inside' }).png().toBuffer();

    return encode(background.composite([{ input: logoBuffer, gravity: 'centre' }]));
}

export const GET: APIRoute = async () => {
    const wallpaper = resolvePublicFile(siteConfig.wallpaper.defaultImage);
    const image = wallpaper ? await renderWallpaperCard(wallpaper) : await renderBrandCard();

    return new Response(new Uint8Array(image), {
        headers: {
            'Content-Type': 'image/jpeg',
            // Static hosting ignores response headers; the matching rule in
            // public/_headers is what actually reaches browsers.
            'Cache-Control': 'public, max-age=31536000, immutable'
        }
    });
};
