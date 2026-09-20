import { sampleGlassTints } from '../src/lib/wallpaper-glass';

describe('wallpaper-glass tint sampler', () => {
    it('degrades gracefully when canvas is unavailable', () => {
        // jsdom has no real 2d canvas, so sampling must return null — the glass
        // surfaces simply keep their previous frame's tint (or the paper-color
        // fallback on the very first frame).
        const img = { naturalWidth: 1920, naturalHeight: 1080 } as HTMLImageElement;
        expect(sampleGlassTints(img)).toBeNull();
    });

    it('returns null for a not-yet-decodable image', () => {
        const img = { naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
        expect(sampleGlassTints(img)).toBeNull();
    });
});
