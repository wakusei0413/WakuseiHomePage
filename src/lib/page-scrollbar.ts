// Pure geometry for the overlay page scrollbar (src/scripts/page-scrollbar.ts).
// Kept DOM-free so it can be unit-tested without layout.

export const MIN_THUMB_SIZE = 32;

export interface ThumbGeometry {
    /** Thumb height in px. */
    size: number;
    /** Thumb offset from the track top in px. */
    offset: number;
}

/** Null when the content does not overflow (no scrollbar needed). */
export function computeThumb(
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
    trackHeight: number
): ThumbGeometry | null {
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 1 || trackHeight <= 0) return null;
    const size = Math.min(trackHeight, Math.max(MIN_THUMB_SIZE, (clientHeight / scrollHeight) * trackHeight));
    const ratio = Math.max(0, Math.min(1, scrollTop / maxScroll));
    return { size, offset: ratio * (trackHeight - size) };
}

/** Maps a thumb offset (px from track top) back to a scrollTop. */
export function scrollTopForThumbOffset(
    offset: number,
    thumbSize: number,
    scrollHeight: number,
    clientHeight: number,
    trackHeight: number
): number {
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const travel = trackHeight - thumbSize;
    if (travel <= 0) return 0;
    return Math.max(0, Math.min(1, offset / travel)) * maxScroll;
}
