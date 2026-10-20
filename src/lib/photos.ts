// Small copies of fish photos for lists. Each one sits next to its photo, e.g.
// "user/fish/1700000000.png" has "user/fish/1700000000-thumb.jpg". Photos from before thumbnails
// were made have none, so lists fall back to the full photo.

export const THUMBNAIL_WIDTH = 300;

export function thumbnailPath(path: string): string {
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  const base = dot > slash ? path.slice(0, dot) : path;
  return `${base}-thumb.jpg`;
}

// A link for each photo: its thumbnail when there is one, otherwise the full photo.
export function thumbnailOrPhoto(
  paths: string[],
  thumbUrls: Record<string, string>,
  photoUrls: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    const url = thumbUrls[thumbnailPath(p)] ?? photoUrls[p];
    if (url) out[p] = url;
  }
  return out;
}
