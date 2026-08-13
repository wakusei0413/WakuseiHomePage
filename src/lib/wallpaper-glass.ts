/**
 * Pre-blurs the current wallpaper frame into small static textures that the
 * glass surfaces (left panel, marquee defocus bed) paint as background images.
 *
 * Why bake the blur into a bitmap instead of using CSS `filter: blur()`?
 * A CSS filter is re-evaluated at paint time, so the moment the wallpaper
 * changes every glass layer re-rasterizes its blur in the same frames as the
 * swap — a visible hitch on each rotation, and it makes the glass layers
 * trigger a second network fetch of the wallpaper URL (the CSS background
 * download is separate from the preloaded <img> element). Baking the blur with
 * canvas means a wallpaper change is just a background texture swap: one cheap
 * paint, zero filter work, zero extra downloads, and the swap can be deferred
 * until the crossfade has finished.
 *
 * The baked texture is returned as a blob: URL, not a data URL: canvas JPEG
 * encoding blocks the main thread for ~100-200ms per texture, while
 * `canvas.toBlob()` encodes on a background thread (and a data URL would also
 * force the browser to base64-decode the whole string on every reference).
 *
 * Textures are small (≤ 640px wide). The blur radius is resolution-independent:
 * the texture is stretched back to the layer size by background-size: cover, so
 * a canvas blur of `B * (canvasW / naturalW)` px displays as roughly `B` px.
 * (On very large screens the effective radius grows with the upscale factor,
 * which suits a proportional glass look.)
 */
export type GlassTextures = {
    /** left panel: heavy frosted glass with boosted saturation */
    panel: string;
    /** marquee defocus bed, far strip */
    far: string;
    /** marquee defocus bed, mid strip */
    mid: string;
    /** marquee defocus bed, near strip */
    near: string;
};

const MAX_TEXTURE_W = 640;
const MAX_TEXTURE_H = 360;

export function canvasBlurSupported(): boolean {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return false;
        }
        // Engines that ignore the filter property report 'none' back.
        ctx.filter = 'blur(2px)';
        return ctx.filter !== 'none' && ctx.filter !== '';
    } catch {
        return false;
    }
}

/**
 * Draws one pre-blurred texture of `img` (which must be fully loaded) and
 * resolves to a blob: URL for it. The draw happens synchronously (small, fast);
 * the JPEG encode runs on a background thread via `canvas.toBlob()`. Resolves
 * to null when canvas or the filter is unavailable, or when the image is not
 * decodable (e.g. a tainted canvas from a cross-origin image without CORS
 * headers — in that case the caller simply keeps the previous texture).
 */
export function bakeGlassTexture(img: HTMLImageElement, cssBlur: number, saturate?: number): Promise<string | null> {
    if (!canvasBlurSupported() || !img || !img.naturalWidth || !img.naturalHeight) {
        return Promise.resolve(null);
    }

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scale = Math.min(1, MAX_TEXTURE_W / naturalW, MAX_TEXTURE_H / naturalH);
    const w = Math.max(64, Math.round(naturalW * scale));
    const h = Math.max(64, Math.round(naturalH * scale));
    // Blur that lands on the same CSS pixels once the texture is stretched back
    // to the display size by background-size: cover.
    const blurPx = Math.max(1, Math.round(cssBlur * (w / naturalW)));

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    try {
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        ctx = canvas.getContext('2d');
        if (!ctx) {
            return Promise.resolve(null);
        }

        const filter = saturate && saturate > 1 ? `blur(${blurPx}px) saturate(${saturate})` : `blur(${blurPx}px)`;
        try {
            ctx.filter = filter;
            ctx.drawImage(img, 0, 0, w, h);
        } catch {
            // The combined filter string was rejected; fall back to blur only,
            // then to a raw copy (better than nothing).
            try {
                ctx.filter = `blur(${blurPx}px)`;
                ctx.drawImage(img, 0, 0, w, h);
            } catch {
                ctx.filter = 'none';
                ctx.drawImage(img, 0, 0, w, h);
            }
        }
    } catch {
        return Promise.resolve(null);
    }

    return new Promise<string | null>((resolve) => {
        try {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    try {
                        resolve(URL.createObjectURL(blob));
                    } catch {
                        resolve(null);
                    }
                },
                'image/jpeg',
                0.72
            );
        } catch {
            resolve(null);
        }
    });
}
