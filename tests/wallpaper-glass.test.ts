import { bakeGlassTexture, canvasBlurSupported } from '../src/lib/wallpaper-glass';

describe('wallpaper-glass pre-blur baker', () => {
    it('degrades gracefully when canvas blur is unavailable', async () => {
        // jsdom has no real 2d canvas, so the feature probe must be false and
        // the baker must resolve to null — the glass surfaces simply keep their
        // previous frame's texture (or plain paper on the very first frame).
        expect(canvasBlurSupported()).toBe(false);
        const img = { naturalWidth: 1920, naturalHeight: 1080 } as HTMLImageElement;
        await expect(bakeGlassTexture(img, 40, 2)).resolves.toBeNull();
    });

    it('returns null for a not-yet-decodable image', async () => {
        const img = { naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
        await expect(bakeGlassTexture(img, 12)).resolves.toBeNull();
    });
});
