import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import { formatViolations, scanWcag } from '../../utils/a11y';

// WCAG checks that matter on a phone: the collapsed layout, the open menu, zoom and touch target size.

test.describe('Mobile accessibility (WCAG 2.2 AA)', { tag: '@a11y' }, () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Accessibility');
    await allure.story('Mobile');
  });

  test('Phone view has no WCAG violations', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();
    const violations = await scanWcag(page, 'mobile page');
    expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
  });

  test('Open phone menu has no WCAG violations', async ({ page, site }) => {
    await site.goto();
    await site.menuButton.tap();
    await expect(site.navLink('gallery')).toBeVisible();
    const violations = await scanWcag(page, 'open menu', { include: '[data-testid="header"]' });
    expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
  });

  test('Menu button tells screen readers if it is open', async ({ site }) => {
    await site.goto();
    await expect(site.menuButton).toHaveAccessibleName(site.labels.menuButton);
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
    await site.menuButton.tap();
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('Pinch-zoom is allowed', async ({ page, site }) => {
    await site.goto();
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/);
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/);
  });

  test('Buttons and links are big enough to tap', async ({ page, site }) => {
    await site.goto();
    await site.menuButton.tap();

    const { failing, spaced } = await page.evaluate(() => {
      const targets = [...document.querySelectorAll<HTMLElement>('a, button, select, input:not([type=hidden]), textarea')]
        .map((el) => ({ el, r: el.getBoundingClientRect(), style: getComputedStyle(el) }))
        .filter(({ r, style }) => r.width > 0 && r.height > 0 && style.visibility !== 'hidden')
        // Inline links inside a sentence are exempt in WCAG 2.5.8.
        .filter(({ el, style }) => !(el.tagName === 'A' && style.display === 'inline' && el.closest('p')));

      const label = (el: HTMLElement, r: DOMRect) =>
        `${el.dataset.testid ?? el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
      // Distance from a point to the nearest edge of a rectangle (0 when inside).
      const distance = (x: number, y: number, r: DOMRect) =>
        Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));

      const failing: string[] = [];
      const spaced: string[] = [];
      for (const t of targets) {
        if (t.r.width >= 24 && t.r.height >= 24) continue;
        // Spacing exception: a 24 px circle centred on the target must not touch any other target.
        const cx = t.r.left + t.r.width / 2;
        const cy = t.r.top + t.r.height / 2;
        const crowded = targets.some((o) => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el) && distance(cx, cy, o.r) < 12);
        (crowded ? failing : spaced).push(label(t.el, t.r));
      }
      return { failing, spaced };
    });
    if (spaced.length) {
      await allure.attachment('small but well spaced targets.txt', spaced.join('\n'), 'text/plain');
    }
    expect(failing, `Too small to tap and too close to other targets:\n${failing.join('\n')}`).toEqual([]);
  });
});
