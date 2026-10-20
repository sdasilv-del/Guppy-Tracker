import { describe, expect, test } from 'bun:test';

import { thumbnailOrPhoto, thumbnailPath } from '@/lib/photos';

describe('thumbnailPath', () => {
  test('puts -thumb before the extension and always saves as JPEG', () => {
    expect(thumbnailPath('u1/f1/1700000000.jpg')).toBe('u1/f1/1700000000-thumb.jpg');
    expect(thumbnailPath('u1/f1/1700000000.png')).toBe('u1/f1/1700000000-thumb.jpg');
  });

  test('handles a path without an extension', () => {
    expect(thumbnailPath('u1/f.1/photo')).toBe('u1/f.1/photo-thumb.jpg');
  });
});

describe('thumbnailOrPhoto', () => {
  test('uses the thumbnail when there is one, otherwise the full photo', () => {
    const urls = thumbnailOrPhoto(
      ['a/1.jpg', 'a/2.png', 'a/3.jpg'],
      { 'a/1-thumb.jpg': 'thumb-1' },
      { 'a/1.jpg': 'full-1', 'a/2.png': 'full-2' },
    );
    expect(urls).toEqual({ 'a/1.jpg': 'thumb-1', 'a/2.png': 'full-2' });
  });
});
