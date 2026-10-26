import { describe, expect, it } from 'vitest';
import { normalizeImageLink } from './image-links';
describe('Image link validation', () => {
  it('accepts HTTPS links with query strings and trims pasted whitespace', () => {
    expect(
      normalizeImageLink(' https://images.example.com/car?id=1&size=large '),
    ).toBe('https://images.example.com/car?id=1&size=large');
  });
  it('rejects malformed, insecure and credential-bearing links', () => {
    for (const value of [
      'https://',
      'https:// bad',
      'http://example.com/a.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,abc',
      '//example.com/a.jpg',
      'https://user:secret@example.com/a.jpg',
    ])
      expect(normalizeImageLink(value)).toBeUndefined();
  });
});
