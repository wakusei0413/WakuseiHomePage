import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { GET } from '../src/pages/og-default.jpg';
import { siteConfig } from '../src/data/site';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const headers = readFileSync(join(process.cwd(), 'public', '_headers'), 'utf8');
const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const checkDist = readFileSync(join(process.cwd(), 'scripts', 'check-dist.mjs'), 'utf8');

async function renderCard(): Promise<Buffer> {
    const response = await GET({} as Parameters<typeof GET>[0]);
    return Buffer.from(await response.arrayBuffer());
}

describe('og-default social card', () => {
    it('renders the Open Graph 1200x630 ratio as a JPEG', async () => {
        const response = await GET({} as Parameters<typeof GET>[0]);
        expect(response.headers.get('content-type')).toBe('image/jpeg');

        const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
        expect(metadata.format).toBe('jpeg');
        expect(metadata.width).toBe(OG_WIDTH);
        expect(metadata.height).toBe(OG_HEIGHT);
    });

    it('composites a real image instead of emitting a flat colour fill', async () => {
        const card = await renderCard();
        const flatPlaceholder = await sharp({
            create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: siteConfig.themeColor }
        })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();

        expect(Buffer.compare(card, flatPlaceholder)).not.toBe(0);
    });
});

describe('og-default wiring', () => {
    it('is used as the layout fallback with matching dimensions', () => {
        expect(baseLayout).toContain("const OG_CARD_PATH = '/og-default.jpg'");
        expect(baseLayout).toContain('const OG_CARD_WIDTH = 1200');
        expect(baseLayout).toContain('const OG_CARD_HEIGHT = 630');
    });

    it('promotes wide images to the large Twitter card and keeps others small', () => {
        expect(baseLayout).toContain("const twitterCard = isWideOgImage ? 'summary_large_image' : 'summary'");
    });

    it('is cacheable and covered by the release checks', () => {
        expect(headers).toContain('/og-default.jpg');
        expect(headers).toContain('max-age=31536000');
        expect(checkDist).toContain("'og-default.jpg'");
    });
});
