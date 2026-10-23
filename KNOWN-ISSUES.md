# Known issues: Substandard Monsters website

Bugs found by testing https://substandard-monsters.com. Each issue lists how to reproduce it, what should
happen, and the automated tests that cover it (they fail while the bug is open).

| ID | Issue | Severity | Status | Found in |
| --- | --- | --- | --- | --- |
| [KI-001](#ki-001-no-upper-character-limit-on-what-the-request-form-sends) | No upper character limit on what the request form sends | Medium | Partly fixed in v1.6.0 | v1.4.3 |
| [KI-002](#ki-002-service-dropdown-text-is-white-on-white-after-a-failed-check) | Service dropdown text is white on white after a failed check | High | Fixed in v1.6.1 (confirm by hand) | v1.6.0 |
| [KI-003](#ki-003-link-field-accepts-text-that-is-not-a-web-address) | Link field accepts text that is not a web address | Medium | Fixed in v1.6.1 | v1.6.0 |
| [KI-004](#ki-004-facebook-button-text-contrast-too-low) | Facebook button text contrast too low (found by automated tests) | Low | Open | v1.4.3 |
| [KI-005](#ki-005-gallery-photos-cannot-be-opened-with-the-keyboard) | Gallery photos cannot be opened with the keyboard (found by automated tests) | Medium | Open | v1.4.3 |
| [KI-006](#ki-006-owners-email-address-is-public-in-the-form-and-captcha-is-off) | Owner's email address is public in the form, and captcha is off | Medium | Open | v1.3.0 |
| [KI-007](#ki-007-no-dev-or-pull-request-preview-on-netlify) | No dev or pull request preview on Netlify | Low | Open | 2026-10-17 |
| [KI-008](#ki-008-old-netlifyapp-address-returns-404) | Old substandard-monsters.netlify.app address returns 404 | Low | Open | 2026-10-18 |
| [KI-009](#ki-009-https-certificate-not-valid-when-the-new-domain-went-live) | HTTPS certificate not valid when the new domain went live | High | Resolved 2026-10-18 | 2026-10-18 |
| [KI-010](#ki-010-request-form-rejected-on-the-new-domain-formsubmit-needs-activation) | Request form rejected on the new domain: FormSubmit needs activation | **Critical** | Resolved 2026-10-19 | v1.6.0 |
| [KI-011](#ki-011-red-error-badges-are-hard-to-read) | Red error badges are hard to read (white on light red, 2.77:1) | Medium | Open | v1.6.0 |
| [KI-012](#ki-012-form-can-stay-on-sending-for-over-30-seconds) | Form can stay on "Sending…" for over 30 seconds (slow FormSubmit reply, no time limit) | Medium | Open | v1.8.0 |

Severity: **Critical** = a main feature doesn't work for anyone · **High** = blocks or confuses visitors · **Medium** = wrong behaviour with a workaround ·
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
- **Status:** Fixed in v1.6.1 ("keep the Service dropdown readable"). The open option list is drawn by the
  operating system, so confirm by hand on Windows, macOS and a phone.
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
- **Status:** Fixed in v1.6.1: each link must look like a web address (`https://` optional); anything else
  gets "Enter a valid link". Confirmed by `file-link.spec.ts` passing on the live site (v1.7.0).
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

**Automated tests:** `tests/monsters/e2e/file-link.spec.ts`, the 6 "File link rejects …" tests (passing since
v1.6.1). The "File link accepts …" tests check that real links keep working.

---

## KI-004: Facebook button text contrast too low

- **Severity:** Low
- **Status:** Open
- **Area:** Contact section, "Substandard Monsters on Facebook" button

White text on Facebook blue (`#1877f2`) has a contrast ratio of **4.23:1**; WCAG 2.2 AA (1.4.3) needs
4.5:1 for normal text. **Fix:** a slightly darker blue (e.g. `#166fe5` or darker) or bold, larger text.

**Automated tests:** `tests/monsters/e2e/contrast.spec.ts` (page readability) and
`tests/monsters/e2e/accessibility.spec.ts` (axe scans).
The two page-readability tests are marked `knownIssue('KI-004')`: they are expected to fail until this is
fixed, and turn red ("expected to fail, but passed") once it is.

---

## KI-005: Gallery photos cannot be opened with the keyboard

- **Severity:** Medium (keyboard and screen-reader users can't enlarge photos)
- **Status:** Open
- **Area:** Gallery

The photos are `<figure>` elements with only a click handler, so they can't be reached with Tab or opened
with Enter (WCAG 2.1.1). **Fix:** add `tabindex="0"` and `role="button"` to each photo and open the
lightbox on Enter/Space too, or wrap each photo in a `<button>`.

**Automated tests:** `tests/monsters/e2e/accessibility.spec.ts`, "Gallery photos open with the keyboard".

---

## KI-006: Owner's email address is public in the form, and captcha is off

- **Severity:** Medium (spam and privacy)
- **Status:** Open
- **Area:** Request a print form

The form's action is `https://formsubmit.co/ajax/adamrzymowski@gmail.com`, so the owner's email address is in
the page source for anyone, including spam bots, to read. With `_captcha` set to `false`, the only
protection against automated submissions is the hidden `_honey` field, which bots that post directly to
FormSubmit simply leave empty.

**Steps to reproduce:** open the site, view the page source (Ctrl+U), search for `formsubmit`.

**Expected:** no personal email address in the page; scripted submissions are hard to send.
**Actual:** the address is public; anyone can post requests directly (see KI-001).

**Possible fix:** replace the email in the action with the random alias FormSubmit gives after
activation (described in the site's SETUP-GUIDE.md), and consider a server-side check (Netlify Function)
or a captcha that works with AJAX submissions.

**Related (v1.8.0, dev):** the page now stops text shaped like database commands (SQL) with a warning and
doesn't send it (`sql-guard.spec.ts`). Like the length limits, it runs only in the page, so it catches
casual attempts but not requests posted straight to FormSubmit; the fixes above are still needed.

**Automated tests:** none since the API tests were removed (2026-10-20); the form tests fake FormSubmit.

---

## KI-007: No dev or pull request preview on Netlify

- **Severity:** Low (affects testing before publishing, not visitors)
- **Status:** Open
- **Area:** Hosting (Netlify)

`https://dev--substandard-monsters.netlify.app` and `https://deploy-preview-<number>--substandard-monsters.netlify.app`
return 404, so changes can't be tested on a deployed copy before they go live. `npm run test:dev` and
`npm run test:preview -- <number>` stop with "not reachable".

**Possible fix:** in Netlify, check the site is linked to the GitHub repository (Site configuration > Build &
deploy), turn on Branch deploys for `dev` and Deploy Previews for pull requests. If the Netlify site name
is no longer `substandard-monsters`, set `MONSTERS_NETLIFY_SITE` in `.env` (see KI-008).

---

## KI-008: Old netlify.app address returns 404

- **Severity:** Low
- **Status:** Open (check whether this is intended)
- **Area:** Hosting (Netlify)

Since the move to `https://substandard-monsters.com`, the old address `https://substandard-monsters.netlify.app`
returns Netlify's "Not Found" page instead of redirecting to the new domain. Links shared earlier (e.g. on
Facebook) and old bookmarks are broken. It suggests the Netlify site was renamed, which also changes the
dev and preview addresses (KI-007).

**Expected:** the old address redirects to `https://substandard-monsters.com`.
**Possible fix:** keep the old Netlify subdomain on the same site (Netlify redirects a site's
`*.netlify.app` address to its primary custom domain automatically), or set up a redirect from it.

---

## KI-009: HTTPS certificate not valid when the new domain went live

- **Severity:** High while it lasted (browsers showed a security warning; visitors could not reach the site
  over HTTPS)
- **Status:** Resolved 2026-10-18
- **Area:** Hosting (Netlify), custom domain

Right after `substandard-monsters.com` was connected, `https://` failed with "certificate name does not
match" (ERR_TLS_CERT_ALTNAME_INVALID) while `http://` worked. Netlify issued the certificate later the
same day; HTTPS now works and `http://` and `www.` redirect to `https://substandard-monsters.com`.

**Lesson:** after connecting a domain, wait for Netlify > Domain management > HTTPS to show the
certificate as active before announcing the new address. The test runner now explains this case when a
site's certificate is invalid.

---

## KI-010: Request form rejected on the new domain: FormSubmit needs activation

- **Severity:** Critical (no print requests reach the owner)
- **Status:** Resolved 2026-10-19: the form is activated for the new domain; two real test requests sent on
  2026-10-19 arrived in the owner's inbox.
- **Found:** 2026-10-18, automated run against https://substandard-monsters.com (v1.6.0)
- **Area:** Request a print form / FormSubmit

**Steps to reproduce**
1. Open https://substandard-monsters.com, go to "Request a print".
2. Fill in the form correctly and click "Send request".

**Expected:** "Thanks! Your request has been sent. I'll be in touch soon." and an email to the owner.
**Actual:** red message "Sorry, something went wrong. Please try again or message me on Facebook. (This form
needs Activation. We've sent you an email containing an 'Activate Form' link. Just click it and your form
will be actived!)". FormSubmit's reply is `{"success":"false","message":"This form needs Activation. …"}`.

**Cause:** FormSubmit activates a form per website address. The form was activated while the site lived on
`substandard-monsters.netlify.app`; since the move to `substandard-monsters.com` it is a new, unactivated
form for FormSubmit, so every submission is rejected until it is activated.

**Fix:** open the "Activate Form" email FormSubmit sent to adamrzymowski@gmail.com (check spam) and click
the link, then send one test request. Consider switching the action to the FormSubmit alias at the same time
(KI-006).

**Automated tests:** `tests/monsters/e2e/real-submit.spec.ts` and the "Complete request is accepted with a success response" API test (opt-in, `SUBMIT_REAL_FORM=1`; API tests removed 2026-10-20); both failed with this message.
The everyday form tests fake FormSubmit's reply, so they could not catch it: run the opt-in tests after any
domain or hosting change.

---

## KI-011: Red error badges are hard to read

- **Severity:** Medium
- **Status:** Open
- **Found:** v1.6.0
- **Area:** Request a print form, field error badges ("Enter your name", "Max. 50 characters", …)

The badges are white bold 12 px text on `#ff6b6b` (the `--error` colour): contrast **2.77:1**, below the
4.5:1 WCAG 2.2 AA (1.4.3) needs for normal-size text. Visitors with low vision, or on a phone in sunlight,
may not be able to read why their request was not sent.

**Steps to reproduce:** open "Request a print", click "Send request" on the empty form, look at the badges
(or check them in DevTools: Elements > the badge > contrast ratio next to `color`).

**Possible fix:** dark text on the light red (e.g. `color: #2b0000` gives about 8:1), or a darker red
background with white text (e.g. `#c62828` gives about 5.6:1).

**Automated tests:** `tests/monsters/e2e/contrast.spec.ts`, "Form error badges and message have enough
contrast" (fails on every browser).
Marked `knownIssue('KI-011')`: expected to fail until this is fixed.

---

## KI-012: Form can stay on "Sending…" for over 30 seconds

- **Severity:** Medium (visitors may think it's broken, leave, or send again and create duplicates)
- **Status:** Open
- **Found:** 2026-10-19, real-submission tests against https://substandard-monsters.com (v1.8.0)
- **Area:** Request a print form / FormSubmit

**What happened:** two real test requests (browser and direct) were sent. FormSubmit delivered both emails,
but did not confirm either request within 30 seconds, so the tests timed out and the page showed "Sending…"
the whole time. FormSubmit's form address itself answered other requests in under half a second, so the
delay is in FormSubmit processing submissions (possibly slower after several automated test submissions).

**Expected:** a confirmation within a few seconds; if it takes too long, a clear message.
**Actual:** "Sending…" with a disabled button for as long as FormSubmit takes. `script.js` has no time limit
on the request, so if FormSubmit never answers, the page never recovers.

**Possible fix:** give the request a time limit in `script.js` (e.g. `AbortSignal.timeout(20000)` on the
`fetch`) and then show a friendlier message such as "This is taking longer than usual: your request may
still arrive. Please wait a few minutes before sending it again."

**Automated tests:** `tests/monsters/e2e/real-submit.spec.ts` now waits up to 2 minutes, passes when FormSubmit confirms, and
separately flags a reply slower than 15 seconds.

---

## Adding an issue

Copy a section above, give it the next ID (KI-013, …), add it to the table, and link the tests that cover
it. When an issue is fixed, set its status to **Fixed in vX.Y.Z** and keep it in the list for history.
