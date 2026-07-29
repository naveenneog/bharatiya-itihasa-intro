/* A small chat client for the Azure deployments in this subscription.

   Used for the two jobs in this pipeline that are genuinely language work rather than
   pipeline work: drafting era beats from a series' own stories, and checking on-screen copy
   for accuracy. Both are grounded — the model is given the real story text and asked to
   work from it — because the failure mode that matters here is confident invention.

   Auth mirrors tools/azure.mjs: an AAD token from the Azure CLI, no keys on disk.
*/
import { token, ENDPOINT } from './azure.mjs';

const APIV = '2025-01-01-preview';

/**
 * One chat completion.
 *
 * @param {string} system
 * @param {string} user
 * @param {{model?: string, json?: boolean, maxTokens?: number}} opts
 */
export async function chat(system, user, { model = 'gpt-5.1', json = false, maxTokens = 8000 } = {}) {
  const body = {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_completion_tokens: maxTokens,
  };
  if (json) body.response_format = { type: 'json_object' };

  const tok = await token();
  const r = await fetch(`${ENDPOINT}/openai/deployments/${model}/chat/completions?api-version=${APIV}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 500)}`);
  const j = JSON.parse(text);
  const out = j.choices?.[0]?.message?.content;
  if (!out) throw new Error(`no content: ${text.slice(0, 400)}`);
  return out;
}

/** Chat that must return JSON. Retries once, because a stray prose preamble is common. */
export async function chatJson(system, user, opts = {}) {
  for (let i = 0; i < 2; i++) {
    const raw = await chat(system, user, { ...opts, json: true });
    try {
      return JSON.parse(raw);
    } catch {
      const a = raw.indexOf('{');
      const b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) {
        try { return JSON.parse(raw.slice(a, b + 1)); } catch { /* fall through to retry */ }
      }
      if (i === 1) throw new Error(`model did not return JSON:\n${raw.slice(0, 600)}`);
    }
  }
  throw new Error('unreachable');
}
