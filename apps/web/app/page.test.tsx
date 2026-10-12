import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import HomePage, { SKELETON_HEADING } from './page';

// The first application test (RFC-2026-034 §8 item 4): CI runs `vitest run` on every head, so a
// test under apps/ or src/ fails the build. It renders the page on the server with React alone --
// no provider, no data, no network.
describe('the skeleton page', () => {
  it('renders its heading and nothing that reaches for data', () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain(`<h1 class="text-2xl font-semibold">${SKELETON_HEADING}</h1>`);
    expect(html).not.toMatch(/<form|<script|https?:\/\//);
  });
});
