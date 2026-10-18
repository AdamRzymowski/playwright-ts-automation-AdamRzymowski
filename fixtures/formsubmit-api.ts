import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test as base } from './base';
import { MONSTERS_URL } from '../sites';
import type { Lang, RequestDetails } from '../pages/monsters/MonstersPage';

/** What the request form looks like in the page's HTML: where it posts and its hidden fields. */
export type FormContract = {
  action: string;
  method: string;
  hidden: Record<string, string>;
  fieldNames: string[];
};

/** Exact JSON FormSubmit returns for an accepted submission (success is the string "true"). */
export const FORMSUBMIT_SUCCESS = { success: 'true', message: 'The form was submitted successfully.' } as const;

/** Real submissions email the site owner, so they need SUBMIT_REAL_FORM=1. */
export const REAL_SUBMISSIONS_ALLOWED = Boolean(process.env.SUBMIT_REAL_FORM);

class FormSubmitApi {
  constructor(private readonly request: APIRequestContext) {}

  /** Reads the request form's action URL, method, hidden fields and field names from a page. */
  async contract(lang: Lang = 'en'): Promise<FormContract> {
    // File names work both locally and on Netlify (which also serves /pl).
    const res = await this.request.get(lang === 'en' ? '/index.html' : '/pl.html');
    const html = await res.text();
    const form = html.match(/<form[^>]*id="request-form"[^>]*>([\s\S]*?)<\/form>/);
    if (!form) throw new Error('No #request-form in the page');
    const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
    const openTag = form[0].slice(0, form[0].indexOf('>') + 1);

    const hidden: Record<string, string> = {};
    for (const [tag] of form[1].matchAll(/<input[^>]*type="hidden"[^>]*>/g)) hidden[attr(tag, 'name')] = attr(tag, 'value');
    // The honeypot is a visible-type text input hidden with CSS.
    const honey = form[1].match(/<input[^>]*name="_honey"[^>]*>/)?.[0];
    if (honey) hidden._honey = attr(honey, 'value');

    const fieldNames = [...form[1].matchAll(/<(?:input|select|textarea)[^>]*name="([^"]+)"/g)].map((m) => m[1]);
    return { action: attr(openTag, 'action'), method: attr(openTag, 'method').toUpperCase(), hidden, fieldNames };
  }

  /** The multipart body the page's script sends (same field names, same dynamic subject line). */
  body(contract: FormContract, details: RequestDetails, lang: Lang = 'en'): Record<string, string> {
    return {
      ...contract.hidden,
      _subject: `${details.service} request from ${details.name} - Substandard Monsters${lang === 'pl' ? ' [PL]' : ''}`,
      Name: details.name,
      email: details.email,
      Service: details.service,
      Quantity: String(details.quantity ?? 1),
      'File link': details.fileLink ?? '',
      Description: details.description,
    };
  }

  /**
   * POSTs a submission to FormSubmit like the browser does. Sends a real email.
   * FormSubmit only accepts posts that name the page they came from (Referer), as browsers do;
   * pass `fromPage: false` to leave it out.
   */
  async submit(
    contract: FormContract,
    body: Record<string, string>,
    { fromPage = true }: { fromPage?: boolean } = {},
  ): Promise<{ res: APIResponse; ms: number; json: Record<string, unknown> | null }> {
    if (!REAL_SUBMISSIONS_ALLOWED) throw new Error('Real submissions send email: set SUBMIT_REAL_FORM=1');
    const headers: Record<string, string> = { Accept: 'application/json', Origin: MONSTERS_URL };
    if (fromPage) headers.Referer = `${MONSTERS_URL}/`;
    const started = Date.now();
    const res = await this.request.post(contract.action, { multipart: body, headers });
    const ms = Date.now() - started;
    // FormSubmit answers with a JSON body but labels it text/html, so parse the text ourselves.
    const json = await res
      .text()
      .then((t) => JSON.parse(t))
      .catch(() => null);
    return { res, ms, json };
  }
}

export const test = base.extend<{ formApi: FormSubmitApi }>({
  baseURL: MONSTERS_URL,
  formApi: async ({ request }, use) => use(new FormSubmitApi(request)),
});

export { expect } from '@playwright/test';
