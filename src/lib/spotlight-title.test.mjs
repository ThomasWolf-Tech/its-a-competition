import test from 'node:test';
import assert from 'node:assert/strict';
import { spotlightTitle } from './spotlight-title.ts';

test('headline accents preserve the exact bracket title and split only between words', () => {
  for (const title of ['Snacks', 'Movie night', 'The ultimate snack showdown', 'Best movie-night snack', 'A'.repeat(60), 'The grand championship of absolutely everything in the world', 'Two  spaces stay']) {
    const { leading, accent } = spotlightTitle(title);
    assert.equal(leading + accent, title);
    assert.ok(accent.length);
    if (leading) assert.match(leading, /\s$/u);
  }
  assert.deepEqual(spotlightTitle('The ultimate snack showdown'), { leading: 'The ultimate ', accent: 'snack showdown' });
  assert.deepEqual(spotlightTitle('Snacks'), { leading: '', accent: 'Snacks' });
});
