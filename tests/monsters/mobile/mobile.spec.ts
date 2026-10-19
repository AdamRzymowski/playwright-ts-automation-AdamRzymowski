import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import type { FormField, MonstersPage } from '../../../pages/monsters/MonstersPage';
import { createPrintRequest } from '../../utils/testData';

// Mobile projects emulate a Pixel 7 (412 px wide, touch). Breakpoints in the site's style.css:
// <=1080 px hamburger menu, <=820 px single column layout, <=480 px logo text hidden.

test.describe('Mobile view', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Mobile layout');
  });

  test.describe('Header and menu', () => {
    test('Menu is hidden behind the hamburger button', { tag: ['@smoke'] }, async ({ site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await site.goto();

      await expect(site.menuButton).toBeVisible();
      await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
      await expect(site.menuButton).toHaveAccessibleName(site.labels.menuButton);
      await expect(site.navLink('gallery')).toBeHidden();
    });

    test('Hamburger opens the menu and a link closes it', async ({ page, site }) => {
      await site.goto();

      await site.menuButton.tap();
      await expect(site.menuButton).toHaveAttribute('aria-expanded', 'true');
      for (const section of ['services', 'gallery', 'how', 'about', 'contact'] as const) {
        await expect.soft(site.navLink(section)).toBeVisible();
      }

      await site.navLink('gallery').tap();
      await expect(page).toHaveURL(/#gallery$/);
      await expect(site.navLink('gallery')).toBeHidden();
      await expect(site.section('gallery')).toBeInViewport();
    });

    test('Tapping the hamburger twice closes the menu', async ({ site }) => {
      await site.goto();

      await site.menuButton.tap();
      await site.menuButton.tap();

      await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
      await expect(site.navLink('gallery')).toBeHidden();
    });

    test('Logo shows only the icon and the language switch fits', async ({ page, site }) => {
      await site.goto();

      // At <=480 px the "Substandard Monsters" text is hidden (font-size 0) and only the icon shows.
      const fontSize = await site.logo.evaluate((el) => getComputedStyle(el).fontSize);
      expect.soft(fontSize).toBe('0px');
      await expect.soft(site.logo.locator('img')).toBeVisible();

      const width = page.viewportSize()!.width;
      for (const lang of ['en', 'pl'] as const) {
        const box = await site.languageLink(lang).boundingBox();
        expect.soft(box, `${lang} link visible`).not.toBeNull();
        expect.soft(box!.x + box!.width, `${lang} link inside screen`).toBeLessThanOrEqual(width);
      }
    });

    test('Header stays at the top while scrolling', async ({ page, site }) => {
      await site.goto();
      await site.section('how').scrollIntoViewIfNeeded();

      const box = await site.header.boundingBox();
      expect(Math.round(box!.y)).toBe(0);
      await expect(site.menuButton).toBeInViewport();
    });
  });

  test.describe('Layout', () => {
    for (const lang of ['en', 'pl'] as const) {
      test(`Page has no sideways scrolling (${lang})`, async ({ page, site, sitePl }) => {
        const s: MonstersPage = lang === 'en' ? site : sitePl;
        await s.goto();

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      });
    }

    test('Service cards stack in one full-width column', async ({ page, site }) => {
      await site.goto('#services');
      const count = await site.serviceCards.count();
      const boxes = await site.boxes(Array.from({ length: count }, (_, i) => `a.service:nth-of-type(${i + 1})`));
      const width = page.viewportSize()!.width;

      for (let i = 1; i < boxes.length; i++) {
        expect.soft(Math.abs(boxes[i]!.x - boxes[0]!.x), `card ${i + 1} left edge`).toBeLessThan(2);
        expect.soft(boxes[i]!.y, `card ${i + 1} below card ${i}`).toBeGreaterThan(boxes[i - 1]!.y + boxes[i - 1]!.height - 1);
      }
      expect.soft(boxes[0]!.width).toBeGreaterThan(width * 0.8);
    });

    test('Hero buttons are visible and easy to tap', async ({ site }) => {
      await site.goto();

      const count = await site.heroButtons.count();
      expect(count).toBe(3);
      for (let i = 0; i < count; i++) {
        const box = await site.heroButtons.nth(i).boundingBox();
        await expect.soft(site.heroButtons.nth(i)).toBeVisible();
        // Comfortable touch target height.
        expect.soft(box!.height, `button ${i + 1} height`).toBeGreaterThanOrEqual(40);
      }
    });

    test('Gallery photos fit the screen in one column', async ({ page, site }) => {
      await site.goto('#gallery');
      // Needs at least two photos to compare; Miniatures has many, Resin may hold only one.
      await site.tab('painting').tap();
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'miniatures');
      const [first, second] = await site.boxes([
        '.gallery:not([hidden]) .gallery-item:nth-child(1)',
        '.gallery:not([hidden]) .gallery-item:nth-child(2)',
      ]);
      const width = page.viewportSize()!.width;

      expect.soft(first!.x + first!.width).toBeLessThanOrEqual(width);
      expect.soft(Math.abs(first!.x - second!.x)).toBeLessThan(2);
      expect.soft(second!.y).toBeGreaterThan(first!.y);
    });
  });

  test.describe('Request form on a phone', () => {
    test.beforeEach(async () => {
      await allure.story('Mobile form');
    });

    test('Form sits below the contact text with full-width fields', { tag: ['@smoke'] }, async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await site.goto('#contact');
      const width = page.viewportSize()!.width;

      const [intro, form, name, email] = await site.boxes([
        '[data-testid="contact-title"]',
        '[data-testid="request-form"]',
        '[data-testid="form-name"]',
        '[data-testid="form-email"]',
      ]);
      expect.soft(form!.y, 'form below the intro text').toBeGreaterThan(intro!.y);
      expect.soft(form!.x + form!.width, 'form inside screen').toBeLessThanOrEqual(width);

      // Name and Email share a row on desktop; on a phone Email goes under Name.
      expect.soft(email!.y).toBeGreaterThan(name!.y + name!.height);
      expect.soft(Math.abs(email!.x - name!.x)).toBeLessThan(2);

      for (const field of ['Name', 'email', 'Service', 'Quantity', 'File link', 'Description'] as FormField[]) {
        const box = await site.field(field).boundingBox();
        expect.soft(box!.width, `${field} width`).toBeGreaterThan(form!.width * 0.7);
      }
    });

    test('Form fields open phone-friendly keyboards', async ({ site }) => {
      await site.goto('#contact');

      await expect.soft(site.field('email')).toHaveAttribute('type', 'email');
      await expect.soft(site.field('Quantity')).toHaveAttribute('type', 'number');
    });

    test('Request can be filled in and sent with taps', async ({ page, site }) => {
      await allure.severity(allure.Severity.BLOCKER);
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
      await site.goto();

      await site.menuButton.tap();
      await site.navLink('contact').tap();
      await expect(site.form).toBeInViewport();

      const request = createPrintRequest();
      await site.field('Name').tap();
      await site.fillRequest(request);
      // Bring the button to mid-screen like a user would, so the reply below it is on screen too.
      // (instant: the site uses smooth scrolling, and a tap mid-animation lands somewhere else)
      await site.submitButton.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await site.submitButton.tap();

      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.formStatus).toBeInViewport();
    });

    test('Validation badges show on a phone', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.abort());
      await site.goto('#contact');

      await site.fillRequest(createPrintRequest({ description: 'too short' }));
      await site.submitButton.tap();

      await expect(site.fieldError('Description')).toHaveText(site.labels.badges.minWords);
      await expect(site.fieldError('Description')).toBeInViewport();
      // v1.6.0 deliberately doesn't move focus or scroll; the field is marked instead.
      await expect(site.field('Description')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  test('Gallery tabs and enlarged photo work with taps', async ({ page, site }) => {
    await site.goto('#gallery');

    await site.tab('painting').tap();
    await site.tab('terrain').tap();
    await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'terrain');

    const photo = site.visibleGallery().locator('.gallery-item').first();
    await photo.tap();
    await expect(site.lightbox).toBeVisible();
    // The enlarged photo must fit on the phone screen.
    const box = await site.lightboxImage.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);

    await site.lightboxClose.tap();
    await expect(site.lightbox).toBeHidden();
  });

  test.describe('Other screen sizes', () => {
    for (const size of [
      { name: 'Small phone', width: 360, height: 740 },
      { name: 'Tablet', width: 768, height: 1024 },
    ]) {
      test.describe(size.name, () => {
        test.use({ viewport: { width: size.width, height: size.height } });

        test(`${size.name} (${size.width}px) layout has no sideways scroll and a single-column form`, async ({ page, site }) => {
          await site.goto('#contact');

          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          expect.soft(scrollWidth).toBeLessThanOrEqual(size.width);
          await expect.soft(site.menuButton).toBeVisible();

          const [name, email] = await site.boxes(['[data-testid="form-name"]', '[data-testid="form-email"]']);
          expect.soft(email!.y).toBeGreaterThan(name!.y + name!.height);
        });
      });
    }
  });
});
