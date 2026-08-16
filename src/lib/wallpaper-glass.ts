/**
 * Samples the current wallpaper frame into two flat tint colors that the glass
 * surfaces (left panel, marquee defocus bed) paint as background colors.
 *
 * Why sample a tint instead of baking a blurred texture?
 * A baked blur is a bitmap with geometry: it must be aligned to the wallpaper's
 * `object-fit: cover` crop and phase-locked to its Ken Burns zoom, and any
 * mismatch reads as a visible drift between the glass and the wallpaper behind
 * it. It also costs a canvas draw + blur + JPEG encode + blob URL per frame.
 * A flat tint has no geometry — it cannot drift — and costs one tiny drawImage
 * plus one getImageData per wallpaper change. The glass reads as "the
 * wallpaper's own color, washed", which is the approximation we want here.
 *
 * The tint is written to CSS custom properties (--glass-panel-tint /
 * --glass-bed-tint) as space-separated RGB triplets, consumed by
 * `rgb(var(--glass-*-tint) / α)`. The surfaces transition background-color, so
 * a wallpaper change crossfades the tint in sync with the wallpaper's own
 * crossfade — no texture slots, no swap orchestration.
 */
export type GlassTints = {
    /** left panel: average of the wallpaper's left strip */
    panel: string;
    /** marquee defocus bed: average of the wallpaper's bottom band */
    bed: string;
};

const SAMPLE_W = 32;
const SAMPLE_H = 18;

/**
 * Samples `img` (which must be fully loaded) into flat tint colors for the
 * glass surfaces. Returns null when canvas/pixel access is unavailable, the
 * image is not decodable, or the canvas is tainted (a cross-origin image
 * without CORS headers) — in that case the caller simply keeps the previous
 * frame's tint.
 */
export function sampleGlassTints(img: HTMLImageElement): GlassTints | null {
    if (!img || !img.naturalWidth || !img.naturalHeight) {
        return null;
    }
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return null;
    }

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const viewW = window.innerWidth || naturalW;
    const viewH = window.innerHeight || naturalH;

    // Replicate the wallpaper's object-fit: cover crop so the tint reflects the
    // region actually on screen, not the raw image.
    const coverScale = Math.max(viewW / naturalW, viewH / naturalH);
    const cropW = viewW / coverScale;
    const cropH = viewH / coverScale;
    const sx = (naturalW - cropW) / 2;
    const sy = (naturalH - cropH) / 2;

    let ctx: CanvasRenderingContext2D | null;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_W;
        canvas.height = SAMPLE_H;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            return null;
        }
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, SAMPLE_W, SAMPLE_H);
    } catch {
        return null;
    }

    let data: Uint8ClampedArray;
    try {
        data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    } catch {
        // Tainted canvas (cross-origin image without CORS headers).
        return null;
    }

    // Panel: the left strip of the visible scene (the panel is ~40% wide).
    const panelCols = Math.max(1, Math.round(SAMPLE_W * 0.4));
    // Bed: the bottom band of the visible scene (the bed is ~40% tall).
    const bedRows = Math.max(1, Math.round(SAMPLE_H * 0.4));

    let pr = 0;
    let pg = 0;
    let pb = 0;
    let pCount = 0;
    let br = 0;
    let bg = 0;
    let bb = 0;
    let bCount = 0;

    for (let y = 0; y < SAMPLE_H; y++) {
        for (let x = 0; x < SAMPLE_W; x++) {
            const i = (y * SAMPLE_W + x) * 4;
            if (x < panelCols) {
                pr += data[i];
                pg += data[i + 1];
                pb += data[i + 2];
                pCount++;
            }
            if (y >= SAMPLE_H - bedRows) {
                br += data[i];
                bg += data[i + 1];
                bb += data[i + 2];
                bCount++;
            }
        }
    }

    if (!pCount || !bCount) {
        return null;
    }

    const panel = `${Math.round(pr / pCount)} ${Math.round(pg / pCount)} ${Math.round(pb / pCount)}`;
    const bed = `${Math.round(br / bCount)} ${Math.round(bg / bCount)} ${Math.round(bb / bCount)}`;
    return { panel, bed };
}
