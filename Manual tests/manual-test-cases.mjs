// Manual test cases: one for each automated UI test (tests/**/e2e and tests/**/mobile, excluding @api / @a11y).
// This file is the source; `npm run manual:build` turns it into manual-test-cases.csv and .pdf in this folder.
// Each case: title, site, area, platform, priority, preconditions, steps [action, expected result], automated test.

export const CASE_VERSION = '1.0';
/** Placeholder that keeps a removed case's number reserved (build skips it). */
export const RETIRED = Symbol('retired');
export const WRITTEN = '2026-10-18 (updated for site v1.7.0 / v1.8.0)';

export const SITES = {
  monsters: { name: 'Substandard Monsters', url: 'https://substandard-monsters.com', appVersion: '1.8.0 (footer "v1.8.0")' },
};

export const PLATFORMS = {
  desktop: 'Desktop: Chrome, Firefox and Edge (latest), window at least 1280 x 720',
  mobile: 'Mobile: Chrome and Edge on an Android phone (or DevTools device mode "Pixel 7", 412 x 915), touch input',
  smallPhone: 'Mobile: small phone, 360 x 740 (DevTools device mode, responsive), Chrome or Edge',
  tablet: 'Tablet: 768 x 1024 (DevTools device mode, responsive), Chrome or Edge',
};

const M_OPEN = 'Open https://substandard-monsters.com in a fresh browser window.';
const M_OPEN_PL = 'Open https://substandard-monsters.com/pl in a fresh browser window.';
const NO_EMAIL =
  'Real submissions email the site owner. Unless the case says otherwise, block the form service first: ' +
  'DevTools (F12) > Network > right-click any request > Block request URL, enter "formsubmit.co" ' +
  '(or use test data marked TEST if a real email is acceptable).';

const m = (o) => ({ site: 'monsters', platform: 'desktop', priority: 'Medium', ...o });

export const CASES = [
  // ---------------------------------------------------------------- Substandard Monsters: home page
  m({
    title: 'Home page loads with title, hero and every section',
    area: 'Home page',
    priority: 'Critical',
    pre: M_OPEN,
    steps: [
      ['Look at the browser tab title.', 'Title reads "Substandard Monsters | 3D Printing Service".'],
      ['Look at the top of the page.', 'Logo and heading "Monstrously good prints. Substandard prices." are shown.'],
      ['Scroll down through the whole page.', 'Sections appear: About, Services, Gallery, How it works, Request a print; each has a heading.'],
      ['Count the cards in Services.', '4 service cards are shown.'],
      ['Count the steps in How it works.', '4 numbered steps are shown.'],
    ],
    auto: 'monsters/e2e/home.spec.ts › Home page loads with title, hero and all sections',
  }),
  ...[
    ['Services', 'services'],
    ['Gallery', 'gallery'],
    ['How it works', 'how'],
    ['About Us', 'about'],
    ['Request a print', 'contact'],
  ].map(([label, id]) =>
    m({
      title: `Header link "${label}" scrolls to its section`,
      area: 'Home page > Navigation',
      pre: M_OPEN,
      steps: [
        [`Click "${label}" in the header.`, `Page scrolls to the ${label === 'Request a print' ? 'Request a print (contact)' : label} section.`],
        ['Look at the address bar.', `Address ends with "#${id}".`],
        ['Look at the screen.', 'The section is visible without further scrolling.'],
      ],
      auto: `monsters/e2e/home.spec.ts › Menu link scrolls to the #${id} section`,
    }),
  ),
  m({
    title: 'Footer shows the current year and safe Facebook links',
    area: 'Home page > Footer',
    pre: M_OPEN,
    steps: [
      ['Scroll to the footer.', 'Copyright line shows the current year.'],
      ['Right-click "Substandard Monsters on Facebook" (contact section) > Inspect.', 'Link goes to https://www.facebook.com/SubstandardMiniatures, has target="_blank" and rel="noopener".'],
      ['Inspect the "Facebook" link in the footer.', 'Same address, target="_blank", rel="noopener".'],
    ],
    auto: 'monsters/e2e/home.spec.ts › Footer shows the current year and safe Facebook links',
  }),
  m({
    title: 'Footer shows the site version',
    area: 'Home page > Footer',
    priority: 'Low',
    pre: M_OPEN,
    steps: [['Scroll to the footer, bottom left.', 'A version like "v1.7.0" is shown (three numbers separated by dots).']],
    auto: 'monsters/e2e/home.spec.ts › Footer shows the site version',
  }),
  m({
    title: 'Every image on the page loads',
    area: 'Home page',
    priority: 'High',
    pre: M_OPEN + ' Open DevTools (F12) > Network, filter "Img", tick "Disable cache".',
    steps: [
      ['Reload the page.', 'Images load; none show a broken-image icon.'],
      ['Click each gallery tab and sub-tab, scrolling through the photos.', 'Every photo appears.'],
      ['Check the Network list.', 'All image requests have status 200 (no 404 or red rows).'],
    ],
    auto: 'monsters/e2e/home.spec.ts › Every image on the page loads',
  }),
  m({
    title: 'Page has no JavaScript errors',
    area: 'Home page',
    pre: 'Open DevTools (F12) > Console, then ' + M_OPEN.toLowerCase(),
    steps: [
      ['Reload the page and wait for it to finish.', 'Console shows no red errors.'],
      ['Click the "Miniatures and Terrain" gallery tab, open a photo, press Escape.', 'Still no red errors in the Console.'],
    ],
    auto: 'monsters/e2e/home.spec.ts › Page runs without JavaScript errors',
  }),

  // ---------------------------------------------------------------- Gallery
  m({
    title: 'Resin gallery is shown by default',
    area: 'Gallery',
    pre: M_OPEN,
    steps: [
      ['Scroll to the Gallery section.', '"Resin printing" tab is highlighted as active.'],
      ['Look at the photos.', 'Only resin photos are shown; the sub-tab row (Miniatures / Terrain) is hidden.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Resin gallery is shown by default',
  }),
  m({
    title: 'Each gallery tab shows only its own photos',
    area: 'Gallery',
    priority: 'High',
    pre: M_OPEN + ' Scroll to the Gallery section.',
    steps: [
      ['Click "Resin printing".', 'Only that tab is highlighted; resin photos are shown (at least one).'],
      ['Click "FDM printing".', 'Only that tab is highlighted; FDM photos replace the previous ones.'],
      ['Click "Design examples".', 'Only that tab is highlighted; design photos are shown.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Each gallery tab shows only its own photos',
  }),
  m({
    title: 'Miniatures and Terrain tab opens sub-tabs and remembers the last one',
    area: 'Gallery',
    pre: M_OPEN + ' Scroll to the Gallery section.',
    steps: [
      ['Click "Miniatures and Terrain".', 'Sub-tabs "Miniatures" and "Terrain" appear; "Miniatures" is active and its photos are shown.'],
      ['Click the "Terrain" sub-tab.', 'Main tab stays highlighted; Terrain is active; terrain photos are shown.'],
      ['Click "FDM printing".', 'Sub-tab row disappears; FDM photos are shown.'],
      ['Click "Miniatures and Terrain" again.', 'Terrain (the last sub-tab used) is shown, not Miniatures.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Miniatures and Terrain tab remembers the last sub-tab',
  }),
  ...[
    ['Resin printing', 'resin', 'Resin printing'],
    ['FDM printing', 'fdm', 'FDM printing'],
    ['Order a project design', 'design', 'Design examples'],
    ['Miniature painting', 'painting', 'Miniatures and Terrain (Miniatures sub-tab)'],
  ].map(([card, id, tab]) =>
    m({
      title: `Service card "${card}" opens its gallery`,
      area: 'Gallery > Services',
      pre: M_OPEN + ' Scroll to Services.',
      steps: [
        [`Click the "${card}" card.`, 'Page scrolls to the Gallery section.'],
        ['Look at the gallery.', `The "${tab}" photos are shown.`],
        ['Look at the address bar.', `Address ends with "#gallery-${id}".`],
      ],
      auto: `monsters/e2e/gallery.spec.ts › Service card "${id}" opens its gallery`,
    }),
  ),
  m({
    title: 'Link to #gallery-fdm opens the FDM gallery',
    area: 'Gallery',
    pre: 'Fresh browser window.',
    steps: [
      ['Open https://substandard-monsters.com/#gallery-fdm.', 'Page opens scrolled to the Gallery.'],
      ['Look at the tabs.', '"FDM printing" is active and FDM photos are shown.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Link to #gallery-fdm opens the FDM gallery',
  }),
  m({
    title: 'Every photo has alt text and a caption',
    area: 'Gallery',
    priority: 'Low',
    pre: M_OPEN + ' Scroll to the Gallery section.',
    steps: [
      ['In each tab and sub-tab, check the text under every photo.', 'Every photo has a non-empty caption.'],
      ['Right-click a few photos > Inspect.', 'Each <img> has a meaningful alt text.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Every gallery photo has alt text and a caption',
  }),
  m({
    title: 'Clicking a photo opens it enlarged with its caption',
    area: 'Gallery > Lightbox',
    priority: 'High',
    pre: M_OPEN + ' Scroll to the Gallery, open "Miniatures and Terrain" > Miniatures.',
    steps: [
      ['Note the caption of the second photo, then click that photo.', 'An overlay opens showing the same photo enlarged.'],
      ['Read the text under the enlarged photo.', 'It matches the caption you noted.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Clicking a photo enlarges it with its caption',
  }),
  m({
    title: 'Enlarged photo closes with Escape, the X button and the backdrop, but not the photo',
    area: 'Gallery > Lightbox',
    pre: M_OPEN + ' Scroll to the Gallery.',
    steps: [
      ['Click a photo, then press Escape.', 'The overlay closes.'],
      ['Click a photo, then click the X button.', 'The overlay closes.'],
      ['Click a photo, then click the enlarged photo itself.', 'The overlay stays open.'],
      ['Click the dark area around the photo (top-left corner).', 'The overlay closes.'],
    ],
    auto: 'monsters/e2e/gallery.spec.ts › Enlarged photo closes with Escape, × or backdrop',
  }),

  // ---------------------------------------------------------------- Languages
  m({
    title: 'Switching from English to Polish and back',
    area: 'Languages',
    priority: 'High',
    pre: M_OPEN,
    steps: [
      ['Look at the EN / PL switch in the header.', 'EN is marked as the current language.'],
      ['Click "PL".', 'Polish page opens (address ends "/pl" or "pl.html"); title contains "Usługi druku 3D"; heading reads "Potwornie dobre wydruki."; menu shows "Galeria".'],
      ['Click "EN".', 'English page opens; heading reads "Monstrously good prints."'],
    ],
    auto: 'monsters/e2e/language.spec.ts › Language switch goes from English to Polish and back',
  }),
  m({
    title: 'Polish menu, gallery tabs and form are translated',
    area: 'Languages',
    pre: M_OPEN_PL,
    steps: [
      ['Read the header menu.', 'Usługi, Galeria, Jak to działa, O nas, Zamów wydruk.'],
      ['Read the gallery tabs.', 'Druk żywiczny, Druk FDM, Przykładowe projekty, Figurki i makiety.'],
      ['Read the form button and note.', 'Button "Wyślij zapytanie"; note "* Pola obowiązkowe".'],
      ['Open the "Usługa" drop-down.', 'Druk żywiczny, Druk FDM, Projekt (nie mam pliku), Malowanie figurek, Nie wiem.'],
    ],
    auto: 'monsters/e2e/language.spec.ts › Polish menu, tabs and form are translated',
  }),
  m({
    title: 'Polish request is sent in Polish and confirmed in Polish',
    area: 'Languages',
    pre: M_OPEN_PL + ' Real email: use TEST data, or block formsubmit.co as in other form cases and expect an error instead.',
    steps: [
      ['Fill in: Imię i nazwisko "TEST Tester", E-mail adamrzymowski@gmail.com, Usługa "Druk FDM", Opis "TEST - test ręczny formularza, proszę zignorować".', 'Fields accept the input.'],
      ['Click "Wyślij zapytanie".', 'Message "Dziękuję! Zapytanie zostało wysłane. Wkrótce się odezwę." appears.'],
      ['Check the inbox of the site owner.', 'Email subject is "Druk FDM request from TEST Tester - Substandard Monsters [PL]" and the Language field says "Polski".'],
    ],
    auto: 'monsters/e2e/language.spec.ts › Polish form sends a Polish request and confirms in Polish',
  }),
  m({
    title: 'Polish 5-word rule message is in Polish',
    area: 'Languages',
    pre: M_OPEN_PL + ' Scroll to the form.',
    steps: [
      ['Fill in name, e-mail and service; type a 3-word description.', 'Fields accept the input.'],
      ['Click "Wyślij zapytanie".', 'Nothing is sent; the description shows the red badge "Min. 5 słów" and "Sprawdź pola zaznaczone na czerwono." appears.'],
    ],
    auto: 'monsters/e2e/language.spec.ts › 5-word rule message is in Polish on the Polish page',
  }),
  m({
    title: 'English and Polish pages have the same photos and services',
    area: 'Languages',
    priority: 'Low',
    pre: 'Open the English and the Polish page side by side.',
    steps: [
      ['Compare the service cards.', 'Both pages have the same 4 services in the same order.'],
      ['Compare each gallery tab and sub-tab.', 'Each gallery shows the same photos, in the same order, on both pages.'],
    ],
    auto: 'monsters/e2e/language.spec.ts › EN and PL pages show the same photos and services',
  }),

  // ---------------------------------------------------------------- Facebook
  ...[
    ['English', M_OPEN, 'Substandard Monsters on Facebook', 'en'],
    ['Polish', M_OPEN_PL, 'Substandard Monsters na Facebooku', 'pl'],
  ].map(([lang, pre, label, code]) =>
    m({
      title: `Facebook links open the Facebook page in a new tab (${lang})`,
      area: 'Facebook',
      priority: 'High',
      pre,
      steps: [
        [`Click "${label}" in the contact section.`, 'A new tab opens on facebook.com showing (or asking you to log in to) the SubstandardMiniatures page.'],
        ['Go back to the first tab.', 'The shop page is still open, unchanged.'],
        ['Click "Facebook" in the footer.', 'Same result: new tab, SubstandardMiniatures page; the shop stays open.'],
      ],
      auto: `monsters/e2e/facebook.spec.ts › Facebook links open the Facebook page in a new tab (${code})`,
    }),
  ),

  // ---------------------------------------------------------------- Request form
  m({
    title: 'Request form shows every field, the required note and no message',
    area: 'Request a print',
    priority: 'High',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [
      ['Look at the form.', 'Fields: Your name *, Email *, Service *, Quantity, Link to your file or reference photos, Describe what you need * (min. 5 words), with a "0 / 1000" counter under the description.'],
      ['Check Quantity.', 'Shows 1; the arrows stay between 1 and 10,000.'],
      ['Read below the button.', 'Button "Send request"; note "* Required fields"; no success or error message yet.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form shows all fields, the required note and no message',
  }),
  m({
    title: 'Complete request is sent and a thank-you message is shown',
    area: 'Request a print',
    priority: 'Critical',
    pre: M_OPEN + ' Click "Request a print". This sends a real email to the owner: use TEST data.',
    steps: [
      ['Fill in every field: name "TEST Tester", email adamrzymowski@gmail.com, Service "Not sure", Quantity 2, link https://example.com, description "TEST manual check of the request form, please ignore".', 'All fields accept the input.'],
      ['Click "Send request".', '"Sending…" shows briefly, then the "Request sent!" pop-up opens; behind it the form says "Thanks! Your request has been sent. I\'ll be in touch soon."'],
      ['Click "Great, thanks".', 'The pop-up closes.'],
      ['Look at the form.', 'All fields are cleared; Quantity is back to 1; the button is enabled.'],
      ['Check the owner\'s inbox.', 'An email "Not sure request from TEST Tester - Substandard Monsters" lists every field and Language "English".'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Complete request sends every field and thanks the visitor',
  }),
  m({
    title: 'Request can be sent with only the required fields',
    area: 'Request a print',
    pre: M_OPEN + ' Click "Request a print". Sends a real email: use TEST data.',
    steps: [
      ['Fill only name, email, service and a description of 5+ words.', 'Fields accept the input.'],
      ['Click "Send request".', 'Thank-you message appears.'],
      ['Check the email.', 'Quantity is 1; File link is empty.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Request with only required fields is sent',
  }),
  m({
    title: 'Form sends to the FormSubmit address',
    area: 'Request a print',
    priority: 'Critical',
    pre: M_OPEN + ' Open DevTools (F12) > Network. ' + NO_EMAIL,
    steps: [
      ['Fill in all required fields and click "Send request".', 'A POST request to https://formsubmit.co/ajax/... appears in Network.'],
      ['Click that request > Headers.', 'Method POST; request header Accept: application/json; address matches the form\'s action attribute.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form posts to its FormSubmit address',
  }),
  m({
    title: 'Service drop-down lists every service',
    area: 'Request a print',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [['Open the Service drop-down.', 'Options: Choose one… (placeholder), Resin print, FDM print, Project design (no file yet), Miniature painting, Not sure.']],
    auto: 'monsters/e2e/request-form.spec.ts › Service dropdown lists every service',
  }),
  m({
    title: '"Request a print" button in the hero leads to the form',
    area: 'Request a print',
    pre: M_OPEN,
    steps: [['Click the "Request a print" button in the large top section.', 'Page scrolls to the form; address ends with "#contact".']],
    auto: 'monsters/e2e/request-form.spec.ts › "Request a print" button leads to the form',
  }),
  m({
    title: 'Empty form cannot be sent',
    area: 'Request a print > Validation',
    priority: 'High',
    pre: M_OPEN + ' Click "Request a print". Open DevTools > Network.',
    steps: [
      ['Without filling anything, click "Send request".', 'Name, Email, Service and Description turn red with badges "Enter your name", "Enter your email", "Choose a service", "Describe what you need"; "Please check the fields marked in red." appears under the button.'],
      ['Check Network and the form.', 'No request to formsubmit.co is made; no message appears under the button.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Empty required fields block sending',
  }),
  ...[
    ['Your name', 'Name', 'Enter your name'],
    ['Email', 'email', 'Enter your email'],
    ['Service', 'Service', 'Choose a service'],
    ['Describe what you need', 'Description', 'Describe what you need'],
  ].map(([field, testField, badge]) =>
    m({
      title: `Missing "${field}" alone blocks sending`,
      area: 'Request a print > Validation',
      pre: M_OPEN + ' Click "Request a print". Open DevTools > Network.',
      steps: [
        [`Fill in every required field except "${field}"${field === 'Service' ? ' (leave "Choose one…")' : ''}.`, 'Other fields accept the input.'],
        ['Click "Send request".', `Only "${field}" turns red with the badge "${badge}"; "Please check the fields marked in red." appears; nothing is sent to formsubmit.co.`],
      ],
      auto: `monsters/e2e/request-form.spec.ts › Missing ${testField} alone blocks sending`,
    }),
  ),
  m({
    title: 'Invalid email address is rejected',
    area: 'Request a print > Validation',
    pre: M_OPEN + ' Click "Request a print". Open DevTools > Network.',
    steps: [
      ['Fill in all fields correctly but type "not-an-email" as Email.', 'Field accepts the text.'],
      ['Click "Send request".', 'Email turns red with the badge "Check the email"; nothing is sent.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Invalid email address is rejected',
  }),
  m({
    title: 'Quantity below 1 is rejected',
    area: 'Request a print > Validation',
    pre: M_OPEN + ' Click "Request a print". Open DevTools > Network.',
    steps: [
      ['Fill in the required fields and type 0 in Quantity.', 'Field shows 0.'],
      ['Click "Send request".', 'Quantity turns red with the badge "Enter 1 to 10,000"; nothing is sent.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Quantity below 1 is rejected',
  }),
  m({
    title: 'Description needs at least 5 words',
    area: 'Request a print > Validation',
    priority: 'High',
    pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
    steps: [
      ['Fill in the required fields with a 4-word description and click "Send request".', 'Nothing is sent; the description shows the red badge "At least 5 words".'],
      ['Change the description to two words, several spaces, two more words.', 'Click Send again: still the "At least 5 words" badge (extra spaces do not count as words).'],
      ['Change it to exactly 5 words and click "Send request".', 'The badge disappears and the request is sent (with formsubmit.co blocked: the red error message appears instead).'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Description needs at least 5 words',
  }),
  m({
    title: 'Hidden spam trap stays empty and out of reach',
    area: 'Request a print > Validation',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [
      ['Click in "Your name" and press Tab repeatedly through the whole form.', 'Focus never lands on an invisible field.'],
      ['Inspect the form (F12) and find input name="_honey".', 'It is hidden (display: none), has tabindex="-1" and is empty.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Hidden spam trap stays empty and unreachable',
  }),
  m({
    title: '"Sending…" is shown while the request is on its way',
    area: 'Request a print > Sending and errors',
    pre: M_OPEN + ' Click "Request a print". DevTools > Network > throttling "Slow 3G". Sends a real email: use TEST data.',
    steps: [
      ['Fill in the required fields and click "Send request".', '"Sending…" appears under the button and the button is disabled.'],
      ['Wait for the reply.', 'The thank-you message replaces "Sending…"; the button is enabled again.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form shows "Sending…" while waiting',
  }),
  m({
    title: 'FormSubmit\'s reason is shown when it rejects the request',
    area: 'Request a print > Sending and errors',
    priority: 'High',
    pre:
      M_OPEN + ' Click "Request a print". In Chrome DevTools > Network, submit once with formsubmit.co blocked, then unblock it, ' +
      'right-click the formsubmit.co request > Override content, and set the body to {"success":"false","message":"This form needs Activation."}.',
    steps: [
      ['Fill in the required fields and click "Send request".', 'Red message: "Sorry, something went wrong. Please try again or message me on Facebook. (This form needs Activation.)"'],
      ['Look at the form.', 'The typed text is kept; the button is enabled.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form shows FormSubmit\'s reason for a rejection',
  }),
  m({
    title: 'Error is shown when the network fails',
    area: 'Request a print > Sending and errors',
    pre: M_OPEN + ' Click "Request a print". DevTools > Network > Block request URL "formsubmit.co" (or set throttling to Offline after the page loads).',
    steps: [
      ['Fill in the required fields and click "Send request".', 'Red message starting "Sorry, something went wrong. Please try again or message me on Facebook." (a reason in brackets may follow).'],
      ['Look at the button.', 'It is enabled again.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form shows an error when the network fails',
  }),
  m({
    title: 'Error is shown when FormSubmit returns a broken reply',
    area: 'Request a print > Sending and errors',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print". In Chrome DevTools > Network, override the formsubmit.co response with status 500 and body "<html>Server error</html>" (Override content).',
    steps: [['Fill in the required fields and click "Send request".', 'Red "Sorry, something went wrong…" message; the button is enabled again.']],
    auto: 'monsters/e2e/request-form.spec.ts › Form shows an error for a broken reply',
  }),
  m({
    title: 'Request can be retried after an error and then succeeds',
    area: 'Request a print > Sending and errors',
    pre: M_OPEN + ' Click "Request a print". DevTools > Network > Block request URL "formsubmit.co". Second attempt sends a real email: use TEST data.',
    steps: [
      ['Fill in the required fields and click "Send request".', 'Red error message; text is kept.'],
      ['Remove the block in DevTools and click "Send request" again.', 'Thank-you message appears (green).'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Form can be resent after an error',
  }),
  m({
    title: 'Real submission reaches FormSubmit end to end',
    area: 'Request a print',
    priority: 'Critical',
    pre: M_OPEN + ' DevTools > Network open. Sends a real email: use TEST data. Automated version is opt-in (SUBMIT_REAL_FORM=1).',
    steps: [
      ['Fill in name "Playwright Test Bot", email adamrzymowski@gmail.com, Service "Not sure", a description starting "[AUTOMATED TEST - please ignore]", and click "Send request".', 'POST to formsubmit.co with Accept: application/json; payload has the subject "Not sure request from Playwright Test Bot - Substandard Monsters" and Language "English".'],
      ['Open the request > Response.', 'Status 200; body {"success":"true","message":"The form was submitted successfully."}.'],
      ['Look at the page.', 'Thank-you message; form cleared; button enabled.'],
    ],
    auto: 'monsters/e2e/real-submit.spec.ts › Real request reaches FormSubmit and shows success',
  }),

  // ---------------------------------------------------------------- Substandard Monsters: mobile
  ...[
    {
      title: 'Menu is collapsed behind the hamburger button',
      area: 'Mobile > Header and menu',
      priority: 'High',
      steps: [
        ['Look at the header.', 'A ☰ button labelled "Open menu" is shown; the menu links are hidden.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Menu is hidden behind the hamburger button',
    },
    {
      title: 'Hamburger opens the menu and a link closes it',
      area: 'Mobile > Header and menu',
      steps: [
        ['Tap ☰.', 'Menu opens with Services, Gallery, How it works, About Us, Request a print.'],
        ['Tap "Gallery".', 'Menu closes; page scrolls to the Gallery; address ends "#gallery".'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Hamburger opens the menu and a link closes it',
    },
    {
      title: 'Tapping the hamburger twice closes the menu',
      area: 'Mobile > Header and menu',
      priority: 'Low',
      steps: [['Tap ☰ twice.', 'Menu opens, then closes; links are hidden again.']],
      auto: 'monsters/mobile/mobile.spec.ts › Tapping the hamburger twice closes the menu',
    },
    {
      title: 'Logo shows only the icon and the language switch fits',
      area: 'Mobile > Header and menu',
      priority: 'Low',
      steps: [
        ['Look at the logo.', 'Only the monster icon is shown, without the "Substandard Monsters" text.'],
        ['Look at EN / PL.', 'Both are fully visible, inside the screen.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Logo shows only the icon and the language switch fits',
    },
    {
      title: 'Header stays at the top while scrolling',
      area: 'Mobile > Header and menu',
      steps: [['Scroll down to "How it works".', 'The header (with ☰) stays pinned at the top of the screen.']],
      auto: 'monsters/mobile/mobile.spec.ts › Header stays at the top while scrolling',
    },
    {
      title: 'No sideways scrolling (English page)',
      area: 'Mobile > Layout',
      priority: 'High',
      steps: [['Scroll the whole page and try swiping left/right.', 'The page never scrolls sideways; nothing is cut off at the right edge.']],
      auto: 'monsters/mobile/mobile.spec.ts › Page has no sideways scrolling (en)',
    },
    {
      title: 'No sideways scrolling (Polish page)',
      area: 'Mobile > Layout',
      pre: 'Open https://substandard-monsters.com/pl on the phone.',
      steps: [['Scroll the whole page and try swiping left/right.', 'The page never scrolls sideways.']],
      auto: 'monsters/mobile/mobile.spec.ts › Page has no sideways scrolling (pl)',
    },
    {
      title: 'Service cards stack in one full-width column',
      area: 'Mobile > Layout',
      steps: [['Scroll to Services.', 'The 4 cards are stacked one under another, each almost the full screen width.']],
      auto: 'monsters/mobile/mobile.spec.ts › Service cards stack in one full-width column',
    },
    {
      title: 'Hero buttons are visible and easy to tap',
      area: 'Mobile > Layout',
      steps: [['Look at the top section.', 'Buttons "About us", "Request a print" and "See the gallery" are visible and at least a finger-tip tall (about 40 px).']],
      auto: 'monsters/mobile/mobile.spec.ts › Hero buttons are visible and easy to tap',
    },
    {
      title: 'Gallery photos fit the screen in one column',
      area: 'Mobile > Layout',
      steps: [
        ['Go to the Gallery, open "Miniatures and Terrain".', 'Photos are shown one per row.'],
        ['Check the edges.', 'Every photo fits inside the screen width.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Gallery photos fit the screen in one column',
    },
    {
      title: 'Contact text sits above the form and fields stack full width',
      area: 'Mobile > Request form',
      priority: 'High',
      steps: [
        ['Tap ☰ > "Request a print".', 'The "Request a print" text and Facebook button are above the form.'],
        ['Look at the form.', 'Email is under Your name (not side by side); every field is nearly the full form width.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Form sits below the contact text with full-width fields',
    },
    {
      title: 'Form fields open phone-friendly keyboards',
      area: 'Mobile > Request form',
      priority: 'Low',
      steps: [
        ['Tap Email.', 'The email keyboard (with @) opens.'],
        ['Tap Quantity.', 'The number keyboard opens.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Form fields open phone-friendly keyboards',
    },
    {
      title: 'Request can be filled in and sent with taps',
      area: 'Mobile > Request form',
      priority: 'Critical',
      pre: 'Sends a real email: use TEST data (or block formsubmit.co and expect the error message).',
      steps: [
        ['Tap ☰ > "Request a print".', 'The form is on screen.'],
        ['Fill in all required fields with TEST data and tap "Send request".', 'Thank-you message appears and is visible without scrolling.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Request can be filled in and sent with taps',
    },
    {
      title: 'Validation messages show on a phone',
      area: 'Mobile > Request form',
      steps: [
        ['Fill in the required fields with the description "too short" and tap "Send request".', 'The description shows the red badge "At least 5 words", visible on the phone screen.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Validation badges show on a phone',
    },
    {
      title: 'Gallery tabs and enlarged photo work with taps',
      area: 'Mobile > Gallery',
      steps: [
        ['Go to the Gallery, tap "Miniatures and Terrain", then "Terrain".', 'Terrain photos are shown.'],
        ['Tap a photo.', 'It opens enlarged and fits the screen width.'],
        ['Tap the X.', 'The overlay closes.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Gallery tabs and enlarged photo work with taps',
    },
    {
      title: 'Small phone (360 px): no sideways scroll, hamburger menu, single-column form',
      area: 'Mobile > Other screen sizes',
      platform: 'smallPhone',
      steps: [
        ['Open the page at 360 x 740 and scroll to the form.', 'No sideways scrolling; ☰ button shown.'],
        ['Look at the form.', 'Email is under Your name.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Small phone (360px) layout has no sideways scroll and a single-column form',
    },
    {
      title: 'Tablet (768 px): no sideways scroll, hamburger menu, single-column form',
      area: 'Mobile > Other screen sizes',
      platform: 'tablet',
      steps: [
        ['Open the page at 768 x 1024 and scroll to the form.', 'No sideways scrolling; ☰ button shown.'],
        ['Look at the form.', 'Email is under Your name.'],
      ],
      auto: 'monsters/mobile/mobile.spec.ts › Tablet (768px) layout has no sideways scroll and a single-column form',
    },
  ].map((c) => m({ platform: 'mobile', pre: 'Open https://substandard-monsters.com on the phone.', ...c })),

  // MT-067 to MT-079: demo-shop (Sauce Demo) cases, removed 2026-10-19 with their tests.
  // Their numbers stay reserved so the other case numbers don't change.
  ...Array(13).fill(RETIRED),

  // ================================================================ Added for site v1.6.0
  // (appended so existing case numbers stay the same)

  m({
    title: 'A red field clears its badge once fixed',
    area: 'Request a print > Validation',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [
      ['Click "Send request" with the form empty.', 'Your name shows the red badge "Enter your name".'],
      ['Type a name in Your name.', 'The badge disappears straight away; the field is no longer red.'],
    ],
    auto: 'monsters/e2e/request-form.spec.ts › Error badge clears once the field is fixed',
  }),

  // ---------------------------------------------------------------- Character limits
  m({
    title: 'Every limited field declares its limit',
    area: 'Request a print > Character limits',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print". Open DevTools (F12) > Elements.',
    steps: [
      ['Inspect Your name, Email, Link and Describe.', 'maxlength is 50, 50, 1000 and 1000.'],
      ['Inspect Quantity.', 'min="1" and max="10000".'],
    ],
    auto: 'monsters/e2e/form-limits.spec.ts › Form fields declare their character limits',
  }),
  ...[
    ['Name', 'Your name', 50, 'Enter 50 letters, e.g. 50 x "Z"'],
    ['email', 'Email', 50, 'Enter a 50-character address, e.g. 38 x "a" followed by "@example.com"'],
    ['File link', 'Link to your file or reference photos', 1000, 'Paste a 1000-character address starting https://www.printables.com/model/'],
    ['Description', 'Describe what you need', 1000, 'Paste 1000 characters of real words'],
  ].flatMap(([field, label, limit, exact]) => [
    m({
      title: `"${label}": typing stops at ${limit} characters`,
      area: 'Request a print > Character limits',
      pre: M_OPEN + ' Click "Request a print".',
      steps: [
        [`Type (not paste) more than ${limit} characters into "${label}".`, `Typing stops at exactly ${limit} characters.`],
      ],
      auto: `monsters/e2e/form-limits.spec.ts › ${field === 'email' ? 'Email' : field} stops accepting typing at ${limit} characters`,
    }),
    m({
      title: `"${label}": exactly ${limit} characters are accepted and sent in full`,
      area: 'Request a print > Character limits',
      pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
      steps: [
        [`Fill in the other required fields, then: ${exact}.`, 'No red badge appears.'],
        ['Click "Send request" and check the formsubmit.co request in DevTools > Network > Payload.', `The field arrives complete, all ${limit} characters.`],
      ],
      auto: `monsters/e2e/form-limits.spec.ts › ${field === 'email' ? 'Email' : field} accepts exactly ${limit} characters`,
    }),
    m({
      title: `"${label}": over ${limit} characters from autofill or a script is blocked`,
      area: 'Request a print > Character limits',
      priority: 'Low',
      pre: M_OPEN + ' Click "Request a print". Open DevTools (F12) > Console. ' + NO_EMAIL,
      steps: [
        ['Fill in the other required fields.', 'Fields accept the input.'],
        [`In the Console run: document.querySelector('[data-testid="${field === 'Name' ? 'form-name' : field === 'email' ? 'form-email' : field === 'File link' ? 'form-file-link' : 'form-description'}"]').value = 'Z'.repeat(${limit + 1})`, `The field now holds ${limit + 1} characters (the console bypasses the limit, as autofill can).`],
        ['Click "Send request".', `The field turns red with the badge "Max. ${limit} characters"; "Please check the fields marked in red."; nothing is sent.`],
      ],
      auto: `monsters/e2e/form-limits.spec.ts › ${field === 'email' ? 'Email' : field} over ${limit} characters is blocked`,
    }),
  ]),
  ...[1, 10000].map((q) =>
    m({
      title: `Quantity ${q} is accepted`,
      area: 'Request a print > Character limits',
      pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
      steps: [
        [`Fill in the required fields and set Quantity to ${q}.`, 'No red badge on Quantity.'],
        ['Click "Send request".', `The request is sent with Quantity ${q}.`],
      ],
      auto: `monsters/e2e/form-limits.spec.ts › Quantity ${q} is accepted`,
    }),
  ),
  ...['0', '-1', '10001', '2.5'].map((q) =>
    m({
      title: `Quantity ${q} is rejected`,
      area: 'Request a print > Character limits',
      pre: M_OPEN + ' Click "Request a print".',
      steps: [
        [`Fill in the required fields and type ${q} in Quantity.`, 'The field shows the value.'],
        ['Click "Send request".', 'Quantity turns red with the badge "Enter 1 to 10,000"; nothing is sent.'],
      ],
      auto: `monsters/e2e/form-limits.spec.ts › Quantity ${q} is rejected`,
    }),
  ),
  m({
    title: 'Description counter shows characters used and warns near the limit',
    area: 'Request a print > Character limits',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [
      ['Look under the description box.', 'Counter reads "0 / 1000".'],
      ['Type "hello world".', 'Counter reads "11 / 1000" in the normal colour.'],
      ['Paste text until the counter reads 899 / 1000.', 'Normal colour.'],
      ['Add one more character (900 / 1000).', 'Counter changes to the warning colour.'],
      ['Fill to 1000.', 'Counter reads "1000 / 1000"; typing stops.'],
    ],
    auto: 'monsters/e2e/form-limits.spec.ts › Description counter counts characters and warns near the limit',
  }),
  m({
    title: 'Description counter resets after a successful send',
    area: 'Request a print > Character limits',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print". Sends a real email: use TEST data.',
    steps: [['Fill in the required fields and send.', 'Thank-you message; the form clears and the counter is back to "0 / 1000".']],
    auto: 'monsters/e2e/form-limits.spec.ts › Description counter resets after sending',
  }),
  m({
    title: 'Polish page shows the limit message in Polish',
    area: 'Request a print > Character limits',
    priority: 'Low',
    pre: M_OPEN_PL + ' Scroll to the form; open DevTools > Console.',
    steps: [
      ['Fill in the required fields; in the Console run: document.querySelector(\'[data-testid="form-name"]\').value = \'Z\'.repeat(51)', 'Name holds 51 characters.'],
      ['Click "Wyślij zapytanie".', 'Name shows "Maks. 50 znaków"; "Sprawdź pola zaznaczone na czerwono." appears.'],
    ],
    auto: 'monsters/e2e/form-limits.spec.ts › Character limit message is in Polish on the Polish page',
  }),

  // ---------------------------------------------------------------- Text colour contrast
  ...[
    ['English page text has enough contrast', 'English page', M_OPEN, 'Scroll through the whole page.'],
    ['Polish page text has enough contrast', 'Polish page', M_OPEN_PL, 'Scroll through the whole page.'],
    ['Open menu text has enough contrast', 'Header and open menu', M_OPEN, 'Open the menu (☰ on a narrow window) and look at the header.'],
    ['Gallery "resin" tab and captions have enough contrast', 'Gallery: Resin printing', M_OPEN, 'Open Gallery > Resin printing.'],
    ['Gallery "fdm" tab and captions have enough contrast', 'Gallery: FDM printing', M_OPEN, 'Open Gallery > FDM printing.'],
    ['Gallery "design" tab and captions have enough contrast', 'Gallery: Design examples', M_OPEN, 'Open Gallery > Design examples.'],
    ['Gallery "painting" tab and captions have enough contrast', 'Gallery: Miniatures and Terrain', M_OPEN, 'Open Gallery > Miniatures and Terrain.'],
    ['Enlarged photo caption has enough contrast', 'Enlarged photo', M_OPEN, 'Open any photo in the gallery.'],
    ['Form error badges and message have enough contrast', 'Form errors', M_OPEN, 'Click "Send request" on the empty form.'],
    ['Form sending and thank-you messages have enough contrast', 'Form sending and sent', M_OPEN, 'Send a TEST request on a slow connection (DevTools > Network > Slow 3G).'],
    ['Description counter warning has enough contrast', 'Description counter warning', M_OPEN, 'Paste 950 characters into the description.'],
  ].map(([testTitle, what, pre, action]) =>
    m({
      title: `Text is readable against its background: ${what}`,
      area: 'Readability (colour contrast)',
      priority: testTitle.startsWith('English') || testTitle.startsWith('Form error') ? 'High' : 'Medium',
      pre: pre + ' Use Chrome DevTools: Elements > pick a text element > Styles shows a contrast ratio next to "color".',
      steps: [
        [action, 'All text is clearly readable at a normal viewing distance.'],
        ['Check the contrast ratio of the text in that area in DevTools (at least the smallest and lightest text).', 'At least 4.5:1 for normal text and 3:1 for large text (about 24 px, or 19 px bold).'],
      ],
      auto: `monsters/e2e/contrast.spec.ts › ${testTitle}`,
    }),
  ),

  // ---------------------------------------------------------------- File link format
  m({
    title: 'File link is optional and has a helpful placeholder',
    area: 'Request a print > File link',
    priority: 'Low',
    pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
    steps: [
      ['Look at "Link to your file or reference photos".', 'Not marked *; placeholder mentions Thingiverse, Printables, Google Drive, Dropbox.'],
      ['Send a request with the link left empty.', 'It is sent normally; File link arrives empty.'],
    ],
    auto: 'monsters/e2e/file-link.spec.ts › File link field is optional with a helpful placeholder',
  }),
  ...[
    ['a Thingiverse link', 'https://www.thingiverse.com/thing:2187167'],
    ['a Printables link', 'https://www.printables.com/model/3161-3d-benchy'],
    ['a Google Drive link with a query', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing'],
    ['a Dropbox link with ?dl=0', 'https://www.dropbox.com/scl/fi/abc123/dragon.stl?rlkey=xyz789&dl=0'],
    ['a link with a #section', 'https://www.myminifactory.com/object/3d-print-dragon-12345#comments'],
    ['an http link', 'http://example.com/models/dragon.3mf'],
    ['a link with an encoded space', 'https://example.com/my%20files/dragon%20v2.stl'],
    ['a link without https://', 'drive.google.com/file/d/1AbCdEf/view'],
    ['two links', 'https://www.thingiverse.com/thing:2187167, https://www.printables.com/model/3161-3d-benchy'],
  ].map(([kind, link]) =>
    m({
      title: `File link accepts ${kind} unchanged`,
      area: 'Request a print > File link',
      pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
      steps: [
        [`Fill in the required fields and paste ${link} as the link.`, 'No red badge on the link field.'],
        ['Click "Send request" and check the request payload in DevTools > Network.', 'File link is sent exactly as pasted.'],
      ],
      auto: `monsters/e2e/file-link.spec.ts › File link accepts ${kind} unchanged`,
    }),
  ),
  ...[
    ['plain text', 'my dragon file'],
    ['a typo in http', 'htp://www.thingiverse.com/thing:123'],
    ['a scheme with no address', 'https://'],
    ['a javascript: link', 'javascript:alert(document.cookie)'],
    ['missing slashes', 'https:www.printables.com/model/1'],
    ['spaces inside a link', 'https://www.printables.com/model/1 2 3'],
  ].map(([kind, link]) =>
    m({
      title: `File link rejects ${kind}`,
      area: 'Request a print > File link',
      priority: kind === 'a javascript: link' ? 'High' : 'Medium',
      pre: M_OPEN + ' Click "Request a print". ' + NO_EMAIL,
      steps: [
        [`Fill in the required fields and type "${link}" as the link.`, 'Field accepts the text.'],
        ['Click "Send request".', 'The link field turns red with the badge "Enter a valid link"; nothing is sent.'],
      ],
      auto: `monsters/e2e/file-link.spec.ts › File link rejects ${kind}`,
    }),
  ),
  // ================================================================ Added for site v1.7.0 / v1.8.0

  // ---------------------------------------------------------------- Success pop-up (v1.7.0)
  m({
    title: 'Success pop-up appears after a request is sent',
    area: 'Request a print > Success pop-up',
    priority: 'Critical',
    pre: M_OPEN + ' Click "Request a print". Sends a real email: use TEST data.',
    steps: [
      ['Fill in the required fields and click "Send request".', 'A pop-up opens over the page: tick icon, title "Request sent!", text "Thanks for your request. I\'ll get back to you with a quote, usually within a day or two. Keep an eye on your inbox (and spam folder).", button "Great, thanks" and an × in the corner.'],
      ['Look behind the pop-up.', 'The form is cleared and says "Thanks! Your request has been sent. I\'ll be in touch soon."'],
    ],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up appears with the right content',
  }),
  m({
    title: 'Success pop-up is modal: focus on its button, page behind blocked',
    area: 'Request a print > Success pop-up',
    pre: M_OPEN + ' Click "Request a print". Sends a real email: use TEST data.',
    steps: [
      ['Send a request.', 'The "Great, thanks" button has keyboard focus (focus ring visible after pressing Tab/Shift+Tab).'],
      ['Try to click the form behind the pop-up.', 'Nothing behind it reacts while the pop-up is open.'],
    ],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up takes focus and blocks the page behind',
  }),
  ...[
    ['"Great, thanks" button', 'button', 'Click "Great, thanks".'],
    ['× button', 'x', 'Click the × in the corner.'],
    ['Escape key', 'escape', 'Press Escape.'],
    ['dark backdrop', 'backdrop', 'Click the dark area outside the pop-up.'],
  ].map(([label, , action]) =>
    m({
      title: `Success pop-up closes with the ${label}`,
      area: 'Request a print > Success pop-up',
      pre: M_OPEN + ' Click "Request a print". Send a TEST request so the pop-up opens.',
      steps: [
        [action, 'The pop-up closes.'],
        ['Type in Your name.', 'The page works normally again.'],
      ],
      auto: `monsters/e2e/success-dialog.spec.ts › Success pop-up closes with the ${label}`,
    }),
  ),
  m({
    title: 'Success pop-up stays open when clicking inside it',
    area: 'Request a print > Success pop-up',
    priority: 'Low',
    pre: M_OPEN + ' Send a TEST request so the pop-up opens.',
    steps: [['Click the pop-up\'s text.', 'The pop-up stays open.']],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up stays open when clicked inside',
  }),
  m({
    title: 'Success pop-up does not appear when sending fails or the form has errors',
    area: 'Request a print > Success pop-up',
    priority: 'High',
    pre: M_OPEN + ' Click "Request a print". DevTools > Network ready to block "formsubmit.co".',
    steps: [
      ['Click "Send request" on the empty form.', 'Red badges and "Please check the fields marked in red."; no pop-up.'],
      ['Block formsubmit.co, fill in the form correctly and send.', 'Red error message; no pop-up.'],
    ],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up does not appear on errors',
  }),
  m({
    title: 'Success pop-up appears again for a second request',
    area: 'Request a print > Success pop-up',
    priority: 'Low',
    pre: M_OPEN + ' Sends two real emails: use TEST data.',
    steps: [
      ['Send a request and close the pop-up.', 'The pop-up closes.'],
      ['Fill in the form again and send.', 'The pop-up opens again.'],
    ],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up appears again for a second request',
  }),
  m({
    title: 'Success pop-up fits on the screen and is readable',
    area: 'Request a print > Success pop-up',
    pre: M_OPEN + ' Send a TEST request. Repeat at phone size (DevTools device mode).',
    steps: [['Look at the pop-up on desktop and on a phone screen.', 'It is fully on screen, the button is visible without scrolling, and all text is clearly readable.']],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up fits the screen and is readable',
  }),
  m({
    title: 'Success pop-up is in Polish on the Polish page',
    area: 'Request a print > Success pop-up',
    pre: M_OPEN_PL + ' Send a TEST request.',
    steps: [['Read the pop-up.', 'Title "Zapytanie wysłane!", text starting "Dziękuję za zapytanie.", button "Super, dzięki", × labelled "Zamknij".']],
    auto: 'monsters/e2e/success-dialog.spec.ts › Success pop-up is in Polish on the Polish page',
  }),

  // ---------------------------------------------------------------- SQL guard (v1.8.0, dev)
  ...[
    ['always-true login trick', "admin' OR '1'='1"],
    ['numeric always-true', "' OR 1=1 --"],
    ['UNION SELECT', '1 UNION SELECT username, password FROM users'],
    ['DROP TABLE', "'; DROP TABLE users; --"],
    ['SELECT * FROM', 'SELECT * FROM orders'],
    ['DELETE FROM … WHERE', 'DELETE FROM orders WHERE 1=1'],
    ['INSERT INTO … VALUES', "INSERT INTO users (name) VALUES ('x')"],
    ['UPDATE … SET', "UPDATE users SET role='admin' WHERE id=1"],
    ['time delay probe', '1 AND SLEEP(5)'],
    ['comment after a quote', "admin'--"],
  ].map(([kind, sample]) =>
    m({
      title: `SQL guard blocks ${kind} in the description`,
      area: 'Security > SQL guard',
      priority: 'High',
      pre: M_OPEN + ' Click "Request a print". Block "formsubmit.co" in DevTools > Network as a safety net (nothing should be sent anyway).',
      steps: [
        [`Fill in the required fields; in the description type a normal sentence followed by: ${sample}`, 'Fields accept the input.'],
        ['Click "Send request".', 'The description shows the red badge "Looks like database code"; the warning "Part of your request looks like database code (SQL), so it was not sent. Please describe what you need in plain words." appears above the button; no pop-up; no request in the Network tab.'],
      ],
      auto: `monsters/e2e/sql-guard.spec.ts › SQL guard blocks ${kind} in the description`,
    }),
  ),
  ...['Name', 'File link'].map((field) =>
    m({
      title: `SQL guard blocks SQL in the ${field === 'Name' ? 'Your name' : 'link'} field`,
      area: 'Security > SQL guard',
      pre: M_OPEN + ' Click "Request a print". Block "formsubmit.co" as a safety net.',
      steps: [
        [`Fill in the form correctly, then type x'; DROP TABLE users; -- in ${field === 'Name' ? 'Your name' : 'the link field'}.`, 'Field accepts the input.'],
        ['Click "Send request".', 'That field shows "Looks like database code"; the SQL warning appears; nothing is sent.'],
      ],
      auto: `monsters/e2e/sql-guard.spec.ts › SQL guard blocks SQL in the ${field} field`,
    }),
  ),
  ...[
    ['select … from', 'Please select a colour from the list, black or red, for this dragon.'],
    ['"drop table" (gaming)', 'I need a drop table for my D&D game, printed in grey PLA please.'],
    ['"delete from"', 'Can you delete from the order the second dragon and make it bigger?'],
    ['"insert into"', 'Insert into the base two magnets please, so the model sticks to the board.'],
    ['apostrophes and dashes', "It's for my son's birthday (he's 7); the 'big' one -- thanks a lot!"],
    ['quotes and equals', "Print 'Dragon' or 'Wyvern' = whichever is cheaper, in red PETG please."],
  ].map(([kind, text]) =>
    m({
      title: `SQL guard lets normal text through: ${kind}`,
      area: 'Security > SQL guard',
      priority: 'High',
      pre: M_OPEN + ' Click "Request a print". Sends a real email: use TEST data (or block formsubmit.co and expect the network error instead of success).',
      steps: [
        [`Fill in the required fields with the description: ${text}`, 'No red badge, no SQL warning.'],
        ['Click "Send request".', 'The request is sent normally (thank-you message and pop-up).'],
      ],
      auto: `monsters/e2e/sql-guard.spec.ts › SQL guard lets normal text through: ${kind}`,
    }),
  ),
  m({
    title: 'SQL warning clears once the text is fixed',
    area: 'Security > SQL guard',
    pre: M_OPEN + ' Click "Request a print".',
    steps: [
      ['Send with a description ending in SELECT * FROM users.', 'SQL warning and badge appear; nothing sent.'],
      ['Replace the description with a normal sentence.', 'Warning and badge disappear while typing.'],
      ['Click "Send request" (TEST data).', 'The request is sent normally.'],
    ],
    auto: 'monsters/e2e/sql-guard.spec.ts › SQL warning clears once the text is fixed',
  }),
  m({
    title: 'SQL warning is in Polish on the Polish page',
    area: 'Security > SQL guard',
    pre: M_OPEN_PL + ' Scroll to the form. Block "formsubmit.co" as a safety net.',
    steps: [
      ["Fill in the form; end the description with ' OR 1=1 -- and click \"Wyślij zapytanie\".", 'Badge "Wygląda jak kod bazy danych" and warning "Część zapytania wygląda jak kod bazy danych (SQL), więc nie zostało wysłane. …"; nothing sent.'],
    ],
    auto: 'monsters/e2e/sql-guard.spec.ts › SQL warning is in Polish on the Polish page',
  }),
  m({
    title: 'SQL warning block is readable',
    area: 'Security > SQL guard',
    priority: 'Low',
    pre: M_OPEN + ' Trigger the SQL warning as above.',
    steps: [['Check the warning\'s contrast in DevTools.', 'Light text on dark red, at least 4.5:1.']],
    auto: 'monsters/e2e/sql-guard.spec.ts › SQL warning has enough contrast',
  }),
];
