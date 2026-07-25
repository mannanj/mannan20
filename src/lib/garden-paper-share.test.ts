import { describe, expect, test } from 'bun:test';
import { getGardenPaperShareUrl } from './garden-paper-share';

describe('getGardenPaperShareUrl', () => {
  test('creates a writings deep link for a paper', () => {
    expect(
      getGardenPaperShareUrl(
        'gmu-archr',
        'https://mannan.is/garden?tab=products#products',
      ),
    ).toBe('https://mannan.is/garden?paper=gmu-archr#writings');
  });
});
