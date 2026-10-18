# Known issues: Substandard Monsters website

Bugs found by testing https://substandard-monsters.com. Each issue lists how to reproduce it, what should
happen, and the automated tests that cover it (they fail while the bug is open).

| ID | Issue | Severity | Status | Found in |
| --- | --- | --- | --- | --- |
| [KI-001](#ki-001-no-upper-character-limit-on-what-the-request-form-sends) | No upper character limit on what the request form sends | Medium | Partly fixed in v1.6.0 | v1.4.3 |
| [KI-002](#ki-002-service-dropdown-text-is-white-on-white-after-a-failed-check) | Service dropdown text is white on white after a failed check | High | Open | v1.6.0 |
| [KI-003](#ki-003-link-field-accepts-text-that-is-not-a-web-address) | Link field accepts text that is not a web address | Medium | Open | v1.6.0 |
| [KI-004](#ki-004-facebook-button-text-contrast-too-low) | Facebook button text contrast too low (found by automated tests) | Low | Open | v1.4.3 |
| [KI-005](#ki-005-gallery-photos-cannot-be-opened-with-the-keyboard) | Gallery photos cannot be opened with the keyboard (found by automated tests) | Medium | Open | v1.4.3 |

Severity: **High** = blocks or confuses visitors · **Medium** = wrong behaviour with a workaround ·
**Low** = cosmetic or affects few visitors.

---

## KI-001: No upper character limit on what the request form sends

- **Severity:** Medium
- **Status:** Partly fixed in v1.6.0
- **Area:** Request a print form

**History.** Up to v1.4.3 the form fields had no maximum length: a visitor could send any amount of text.

**Fixed in v1.6.0 (in the page):** Your name and Email are limited to 50 characters, Link and
Description to 1000, and Quantity to 1–10,000. Typing stops at the limit, and longer text put in by
autofill or a script gets the red badge "Max. N characters" and isn't sent.

**Still open (outside the page):** the limits are enforced only by the page's own JavaScript. The form posts
straight to FormSubmit (`https://formsubmit.co/ajax/<address>`, visible in the page source), which accepts
any length. Anyone can bypass the page and send oversized requests or spam directly.

**Steps to reproduce (open part)**
1. Send a POST to the form's FormSubmit address with a `Description` of 50,000 characters (for example with
   curl or Postman, with a `Referer` header of the site address).
2. FormSubmit accepts it and emails it to the owner.

**Expected:** requests over the limits are rejected wherever they come from.
**Actual:** only the page checks the limits.

**Possible fixes:** use the FormSubmit alias instead of the real email address in the form's action (see
SETUP-GUIDE.md), turn FormSubmit's captcha on, or send the form through a small server function (e.g. a
Netlify Function) that checks the limits before forwarding.

**Automated tests:** `tests/monsters/e2e/form-limits.spec.ts` (page limits, all passing in v1.6.0).

---

## KI-002: Service dropdown text is white on white after a failed check

- **Severity:** High (visitors can't read the options they must choose from)
- **Status:** Open
- **Area:** Request a print form, Service dropdown

**Steps to reproduce**
1. Open the site, go to "Request a print".
2. Click "Send request" without choosing a Service.
3. The Service field turns red with "Choose a service".
4. Open the Service dropdown.

**Expected:** the options (Resin print, FDM print, …) are readable, light text on a dark background as before
the check.
**Actual:** the option list is white text on a white background, so it can't be read.

**Cause:** `style.css` gives an invalid field a see-through background:
`.form [aria-invalid="true"] { … background: rgba(255,107,107,.06); }`. A dropdown's option list can't be
see-through, so the browser draws it on its default white, while the text keeps the site's white colour
(`--text: #ffffff`). Before the check the field has the solid dark `background: var(--bg)`, which the
option list uses.

**Possible fix:** give the options their own solid colours, e.g.
`.form select option { background: var(--bg); color: var(--text); }`, or use a solid tinted colour instead
of a transparent one for invalid fields.

**Automated tests:** `tests/monsters/e2e/contrast.spec.ts` checks the form after a failed check. The open
option list is drawn by the operating system, outside the web page, so automated contrast checks can't see
it. Check it by hand with manual case *"Text is readable against its background: Form errors"* in
`Manual tests/manual-test-cases.pdf`.

---

## KI-003: Link field accepts text that is not a web address

- **Severity:** Medium (and a security concern for the `javascript:` case)
- **Status:** Open
- **Area:** Request a print form, "Link to your file or reference photos"

**Steps to reproduce**
1. Open "Request a print", fill in the required fields.
2. In the link field type any of: `my dragon file`, `htp://www.thingiverse.com/thing:123`, `https://`,
   `javascript:alert(document.cookie)`, `https:www.printables.com/model/1`.
3. Click "Send request".

**Expected:** the link field turns red with a badge asking for a web address starting with http:// or
https://, and the request isn't sent (the field stays optional when left empty).
**Actual:** the request is sent with the text as it is. The field is `type="text"` and only its length is
checked.

**Why it matters:** the owner gets requests with links that don't open. A `javascript:` "link" in the
email could run code if the owner clicks it in some mail clients.

**Possible fix:** add a check in `script.js` for the File link when it isn't empty, e.g.
`/^https?:\/\/[^\s/$.?#].[^\s]*$/i`, with a badge such as "Enter a link starting with https://", and a
Polish version for pl.html.

**Automated tests:** `tests/monsters/e2e/file-link.spec.ts`, the 6 "flags a malformed link" tests (failing
until fixed). The "accepts a … link" tests check that real links keep working.

---

## KI-004: Facebook button text contrast too low

- **Severity:** Low
- **Status:** Open
- **Area:** Contact section, "Substandard Monsters on Facebook" button

White text on Facebook blue (`#1877f2`) has a contrast ratio of **4.23:1**; WCAG 2.2 AA (1.4.3) needs
4.5:1 for normal text. **Fix:** a slightly darker blue (e.g. `#166fe5` or darker) or bold, larger text.

**Automated tests:** `tests/monsters/e2e/contrast.spec.ts` (page readability) and
`tests/monsters/e2e/accessibility.spec.ts` (axe scans).

---

## KI-005: Gallery photos cannot be opened with the keyboard

- **Severity:** Medium (keyboard and screen-reader users can't enlarge photos)
- **Status:** Open
- **Area:** Gallery

The photos are `<figure>` elements with only a click handler, so they can't be reached with Tab or opened
with Enter (WCAG 2.1.1). **Fix:** add `tabindex="0"` and `role="button"` to each photo and open the
lightbox on Enter/Space too, or wrap each photo in a `<button>`.

**Automated tests:** `tests/monsters/e2e/accessibility.spec.ts`, "gallery photos can be opened with the
keyboard".

---

## Adding an issue

Copy a section above, give it the next ID (KI-006, …), add it to the table, and link the tests that cover
it. When an issue is fixed, set its status to **Fixed in vX.Y.Z** and keep it in the list for history.
