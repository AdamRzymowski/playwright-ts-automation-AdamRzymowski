---
name: wcag-check
description: WCAG 2.2 level AA accessibility checklist (covers WCAG 2.0 and 2.1 too) for the Substandard Monsters website and anything this test project shows to people. Use for EVERY UI change before it is committed - anything that changes what people see or interact with: the site's HTML/CSS/page scripts in ../Substandard-Monsters, and HTML pages this project generates (e.g. the Allure by-browser index). Not needed for test code, configs, scripts or docs. Walks through the four WCAG principles (Perceivable, Operable, Understandable, Robust), says which criteria the change touches, how to check each one (automated axe tests in this repo plus quick manual checks), and how to report and log failures.
---

# WCAG check

## Description

This skill checks a change against **WCAG 2.2 level AA**, the level most accessibility laws use, including
the European Accessibility Act / EN 301 549. WCAG 2.2 contains everything in 2.0 and 2.1, so passing 2.2 AA
also passes the older versions.

WCAG is built on four principles, **POUR**. Content must be:
- **Perceivable:** everyone can see or hear it;
- **Operable:** everyone can use it, including with only a keyboard;
- **Understandable:** it is clear and predictable;
- **Robust:** it works with assistive technology such as screen readers.

Use it on every **UI change**, meaning anything that changes what people see or interact with on the site
or on a page this project generates (CLAUDE.md "Accessibility"). It complements, but doesn't replace, the automated tests:
- `tests/monsters/e2e/accessibility.spec.ts` and `tests/monsters/mobile/accessibility.spec.ts`, tagged `@a11y`;
- `tests/monsters/e2e/contrast.spec.ts`;
- the axe helper `tests/utils/a11y.ts`.

Axe finds only about a third of WCAG problems automatically, so the manual checks below matter.

## 1. Decide what the change touches
List the parts of the page that changed and tick the matching groups. Only those groups need checking:

| The change touches… | Check groups |
| --- | --- |
| Text, colours, fonts, backgrounds, badges, buttons | A (contrast, colour), C (resize, spacing) |
| Images, photos, icons, gallery | A (text alternatives) |
| Layout, CSS widths, phone view, menu | C (reflow, zoom), D (focus visible / not hidden), E (target size) |
| Anything you can click, tab to or type in | D (keyboard, focus), E (pointer, target size), G (name, role, value) |
| The request form, its errors and messages | F (labels, errors, help), G (status messages) |
| Page language, menus, headings, links | B (structure), F (consistency, language) |
| Moving things: carousels, animations, pop-ups, timeouts | D (pause, timing), E (motion) |

## 2. Checklist by principle (WCAG 2.2 AA)
Each line gives the success criterion (SC), what it means here, and **how to check it**.

### Perceivable
**A. See and hear it**
- **1.1.1 Non-text content (A):** every photo and image has a meaningful `alt`; decorative images such as
  tab thumbnails use `alt=""`. *Check:* axe `image-alt`; read the alt texts in EN and PL.
- **1.4.1 Use of colour (A):** errors aren't shown by colour alone; there is a red badge **and** text.
  *Check:* look at the form error state.
- **1.4.3 Contrast, minimum (AA):** text at least **4.5:1**; large text (24 px, or 18.7 px bold) at least
  **3:1**. *Check:* `contrast.spec.ts` (KI-004, KI-011 are open).
- **1.4.11 Non-text contrast (AA):** field borders, focus outlines, icons and button edges at least **3:1**
  against what's next to them. *Check:* by eye, or measure the colours.

**B. Structure**
- **1.3.1 Info and relationships (A):** real headings (`h1` → `h2` → `h3`, no skipped levels), lists as
  `ul`/`ol`, labels tied to fields, `fieldset`/`legend` for groups. *Check:* axe; the browser's
  accessibility tree.
- **1.3.2 Meaningful sequence (A):** the reading and tab order follows the visual order. *Check:* Tab
  through the page.
- **1.3.5 Identify input purpose (AA):** the form's name and email fields have `autocomplete="name"` and
  `autocomplete="email"`.

**C. Adapts to the user**
- **1.3.4 Orientation (AA):** works in portrait and landscape. *Check:* rotate the phone view.
- **1.4.4 Resize text (AA):** usable at 200% zoom.
- **1.4.10 Reflow (AA):** no sideways scrolling at **320 px** wide, except the photos themselves.
  *Check:* the mobile specs (tablet and phone widths); try 320 × 640 by hand.
- **1.4.12 Text spacing (AA):** nothing is cut off with line height 1.5, letter spacing 0.12 em and word
  spacing 0.16 em.
- **1.4.13 Content on hover or focus (AA):** tooltips and pop-ups that appear on hover can be closed with
  Escape and stay while hovered.

### Operable
**D. Keyboard and focus**
- **2.1.1 Keyboard (A):** everything works with Tab, Enter, Space and Escape: menu, gallery tabs, photos,
  form, pop-ups. *Check:* the keyboard tests in `accessibility.spec.ts` (KI-005 is open: gallery photos).
- **2.1.2 No keyboard trap (A):** focus can always leave: the lightbox, success pop-up and phone menu.
- **2.4.3 Focus order (A):** a dialog takes focus when it opens and gives it back when it closes.
- **2.4.7 Focus visible (AA):** every focused element shows an outline. *Check:* "Focused fields show a
  visible outline".
- **2.4.11 Focus not obscured, minimum (AA, new in 2.2):** the sticky header never fully covers the focused
  element. *Check:* Tab down the page in phone and desktop view.
- **2.2.1 Timing adjustable / 2.2.2 Pause, stop, hide (A):** no time limits; anything that moves for over
  5 s can be paused.

**E. Pointer and motion**
- **2.5.3 Label in name (A):** a button's accessible name contains its visible text.
- **2.5.7 Dragging movements (AA, new in 2.2):** nothing needs dragging; a tap or click alternative exists.
- **2.5.8 Target size, minimum (AA, new in 2.2):** tap targets are at least **24 × 24 px**, or have enough
  space around them. *Check:* "Buttons and links are big enough to tap".
- **2.3.1 Three flashes (A):** nothing flashes more than 3 times a second.

**Navigation**
- **2.4.1 Bypass blocks (A):** there's a way to skip the header, such as a skip link or landmarks
  (`header`, `nav`, `main`, `footer`).
- **2.4.2 Page titled (A):** each page has a meaningful `<title>` in its language.
- **2.4.4 Link purpose (A):** link text makes sense on its own; no bare "click here". A link that opens a new
  tab (Facebook) says so.
- **2.4.6 Headings and labels (AA):** headings and labels describe what follows.

### Understandable
**F. Clear and predictable**
- **3.1.1 Language of page (A):** `<html lang="en">` / `lang="pl"`. *Check:* "Pages declare their language".
- **3.1.2 Language of parts (AA):** words in the other language (for example the "PL"/"EN" switch) have
  `lang` set.
- **3.2.1 On focus / 3.2.2 On input (A):** focusing or typing never submits, navigates or opens something by
  surprise.
- **3.2.3 Consistent navigation / 3.2.4 Consistent identification (AA):** the menu and its labels are the
  same on every page and in both languages.
- **3.2.6 Consistent help (A, new in 2.2):** contact details or the request link are in the same place on
  every page.
- **3.3.1 Error identification (A):** the field in error is named in text. *Check:* the form error tests.
- **3.3.2 Labels or instructions (A):** each field has a visible label, and limits (1–10,000, max length)
  are stated.
- **3.3.3 Error suggestion (AA):** errors say how to fix it ("Enter 1 to 10,000").
- **3.3.4 Error prevention (AA):** applies to legal or financial submissions. A quote request isn't one, but
  keep the confirmation pop-up.
- **3.3.7 Redundant entry (A, new in 2.2):** no asking for the same information twice.
- **3.3.8 Accessible authentication (AA, new in 2.2):** only if a login or captcha is added (KI-006): no
  puzzle without an alternative.

### Robust
**G. Works with assistive technology**
- **4.1.2 Name, role, value (A):**
  - custom controls have the right role and state: gallery tabs `role="tab"` with `aria-selected`, the menu
    button with `aria-expanded`, the dialog with `aria-labelledby`;
  - icon-only buttons (×) have an `aria-label`.

  *Check:* axe; "Menu button tells screen readers if it is open".
- **4.1.3 Status messages (AA):** "Sending…", "Please check the fields marked in red", the SQL warning and
  the success message are announced. Use `role="status"` / `aria-live="polite"`, or `role="alert"` for
  errors.
- 4.1.1 Parsing was removed in WCAG 2.2; ignore it.

## 3. Check it
1. **Read the change** against the groups ticked in section 1 and note each criterion that applies.
2. **Run the accessibility tests:** `npm run tests -- --suite=a11y` plus `contrast.spec.ts`. These are runs
   against a site, so ask first (CLAUDE.md "Ask before running"). Unpublished site changes are tested with
   `--env=local`.
3. **Do the manual checks** for the ticked groups: keyboard-only walk-through, 200% zoom, 320 px width, and
   focus never hidden under the header.
4. **Missing coverage?** If a criterion the change touches has no automated test, add one with the
   `test-creation-template` skill, tagged `@a11y`.

## 4. Report and log
- Tell the owner, in a short table: criterion, result (pass / fail / not applicable / not checked), and
  evidence (test name or what was checked by hand).
- A failure on the site → a `KNOWN-ISSUES.md` entry. Include the WCAG criterion number and level, the
  measured value (for example "contrast 2.77:1, needs 4.5:1"), the steps, a fix and the covering test.
  Don't weaken a test to make it pass.
- Pages this project generates (Allure index, PDF, k6 report): fix the problem in this repo directly.
