/*  Managish voice assistant – Level 2 (AI conversation)
    Cloudflare Worker (free plan). Keeps the Anthropic API key secret.
    Setup: Cloudflare dashboard → Workers → Create → paste this file →
    Settings → Variables → add secret ANTHROPIC_API_KEY → Deploy.
    Then paste the worker address in the app: Admin → Settings → Voice Level 2. */
const MODELS = { quick: 'claude-haiku-5-5', deep: 'claude-sonnet-5-5' };
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Managish voice OK', { headers: cors });
    try {
      const { model, question, context, history, owner } = await req.json();
      const system = `You are the friendly voice assistant of ${owner || 'Lydia'}, admin of Managish restaurant (Aljada, Sharjah + cloud kitchen, Dubai). You speak only with ${owner || 'Lydia'}. Answer briefly (2-5 sentences, it is read aloud), warmly, in the language of the question. Use ONLY the restaurant data below for facts and numbers; if the data does not contain the answer, say so. Do calculations carefully.\n\nRESTAURANT DATA (JSON):\n${JSON.stringify(context).slice(0, 60000)}`;
      const messages = (history || []).filter(m => m && m.t).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: String(m.t) })).slice(-8);
      while (messages.length && messages[0].role !== 'user') messages.shift();
      if (!messages.length || messages[messages.length - 1].content !== question) messages.push({ role: 'user', content: question });
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: MODELS[model] || MODELS.quick, max_tokens: model === 'deep' ? 900 : 400, system, messages }) });
      const j = await r.json();
      const answer = j.content && j.content[0] ? j.content[0].text : (j.error ? 'AI error: ' + j.error.message : 'No answer');
      return new Response(JSON.stringify({ answer }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  }
};
