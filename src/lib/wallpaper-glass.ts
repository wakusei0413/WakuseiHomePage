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
 * The blur is computed on the CPU with a separable box blur (three passes,
 * edge-clamped) rather than `CanvasRenderingContext2D.filter`. That property is
 * unsupported in Safari before 18 (the iPad the site is viewed on), and it also
 * bleeds the image edge to transparent — which JPEG then encodes as a dark
 * fringe around the texture. A hand-rolled box blur runs identically everywhere
 * and clamps the edge, so there is no fringe and the frosted glass works on
 * every browser. The textures are tiny (≤ 640×360), so the one-time cost per
 * frame (~a few ms, spread across one frame each) is invisible.
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

/**
 * Whether the frosted-glass baker can run in this environment. It needs a 2d
 * canvas plus pixel access (getImageData/putImageData), which the CPU blur uses.
 * This is true on every real browser (including Safari < 18, which lacks the
 * native `ctx.filter` but supports pixel access); it is only false where there
 * is no canvas at all (e.g. jsdom), in which case the glass keeps plain paper.
 */
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
        return typeof ctx.getImageData === 'function' && typeof ctx.putImageData === 'function';
    } catch {
        return false;
    }
}

/** Horizontal box blur (edge-clamped), operating on all four RGBA channels. */
function boxBlurH(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number): void {
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
        const row = y * w;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        for (let x = -r; x <= r; x++) {
            const i = (row + Math.min(w - 1, Math.max(0, x))) << 2;
            sumR += src[i];
            sumG += src[i + 1];
            sumB += src[i + 2];
            sumA += src[i + 3];
        }
        for (let x = 0; x < w; x++) {
            const o = (row + x) << 2;
            dst[o] = sumR * inv;
            dst[o + 1] = sumG * inv;
            dst[o + 2] = sumB * inv;
            dst[o + 3] = sumA * inv;
            const ri = (row + Math.min(w - 1, Math.max(0, x - r))) << 2;
            const ai = (row + Math.min(w - 1, Math.max(0, x + r + 1))) << 2;
            sumR += src[ai] - src[ri];
            sumG += src[ai + 1] - src[ri + 1];
            sumB += src[ai + 2] - src[ri + 2];
            sumA += src[ai + 3] - src[ri + 3];
        }
    }
}

/** Vertical box blur (edge-clamped), operating on all four RGBA channels. */
function boxBlurV(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number): void {
    const inv = 1 / (2 * r + 1);
    for (let x = 0; x < w; x++) {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        for (let y = -r; y <= r; y++) {
            const i = (Math.min(h - 1, Math.max(0, y)) * w + x) << 2;
            sumR += src[i];
            sumG += src[i + 1];
            sumB += src[i + 2];
            sumA += src[i + 3];
        }
        for (let y = 0; y < h; y++) {
            const o = (y * w + x) << 2;
            dst[o] = sumR * inv;
            dst[o + 1] = sumG * inv;
            dst[o + 2] = sumB * inv;
            dst[o + 3] = sumA * inv;
            const ri = (Math.min(h - 1, Math.max(0, y - r)) * w + x) << 2;
            const ai = (Math.min(h - 1, Math.max(0, y + r + 1)) * w + x) << 2;
            sumR += src[ai] - src[ri];
            sumG += src[ai + 1] - src[ri + 1];
            sumB += src[ai + 2] - src[ri + 2];
            sumA += src[ai + 3] - src[ri + 3];
        }
    }
}

/**
 * Blurs `data` in place with three box-blur passes (an O(n) Gaussian
 * approximation). `radius` is in the same "blur(Npx)" units the CSS filter used:
 * three passes of radius `r` have sigma ≈ r, so `r = radius / 2` reproduces
 * `blur(radius px)` (whose Gaussian sigma is radius / 2). Edge clamping keeps the
 * border opaque, so the JPEG encode has no dark fringe.
 */
function boxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number): void {
    if (radius < 1 || w < 2 || h < 2) {
        return;
    }
    const r = Math.max(1, Math.round(radius / 2));
    const tmp = new Uint8ClampedArray(data.length);
    for (let pass = 0; pass < 3; pass++) {
        boxBlurH(data, tmp, w, h, r);
        boxBlurV(tmp, data, w, h, r);
    }
}

/** Boosts saturation in place (luma-preserving lerp toward the luma). */
function applySaturation(data: Uint8ClampedArray, saturate: number): void {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = luma + (r - luma) * saturate;
        data[i + 1] = luma + (g - luma) * saturate;
        data[i + 2] = luma + (b - luma) * saturate;
    }
}

/**
 * Draws one pre-blurred texture of `img` (which must be fully loaded) and
 * resolves to a blob: URL for it. The draw + CPU blur happen synchronously
 * (small, fast); the JPEG encode runs on a background thread via
 * `canvas.toBlob()`. Resolves to null when canvas/pixel access is unavailable,
 * or when the image is not decodable (e.g. a tainted canvas from a cross-origin
 * image without CORS headers — in that case the caller simply keeps the
 * previous texture).
 */
export function bakeGlassTexture(img: HTMLImageElement, cssBlur: number, saturate?: number): Promise<string | null> {
    if (!img || !img.naturalWidth || !img.naturalHeight) {
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

        // Draw the raw frame, then blur it on the CPU (works everywhere, and
        // clamps edges so the texture has no dark fringe), then optionally
        // saturate — matching the old `blur(Npx) saturate(S)` filter order.
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        boxBlur(imageData.data, w, h, blurPx);
        if (saturate && saturate > 1) {
            applySaturation(imageData.data, saturate);
        }
        ctx.putImageData(imageData, 0, 0);
    } catch {
        // Tainted canvas (cross-origin image without CORS) or missing pixel
        // access: keep the previous frame's texture.
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
