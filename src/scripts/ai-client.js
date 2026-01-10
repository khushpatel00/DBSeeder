async function generateWithAI() {
  const btn = document.getElementById('generateBtn');
  const input = document.getElementById('textinput');
  const outputEl = document.getElementById('code');

  if (!input || !outputEl || !btn) return;

  const API_BASE = window.location.origin;
  const schema = (input.value || '').trim();
  const rows = 5;

  if (!schema) {
    outputEl.textContent = 'Paste or drop a SQL schema first.';
    input.focus();
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  outputEl.textContent = 'Generating...';

  try {
    const res = await fetch(`${API_BASE}/generate-fake-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, rows, ai: false, dialect: 'postgres' })
    });

    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();
    const data = contentType.includes('application/json') ? JSON.parse(raw) : null;

    if (!res.ok || !data?.sql) {
      const err = data?.error || raw?.slice(0, 200) || `HTTP ${res.status}`;
      outputEl.textContent = `Error: ${err}`;
      return;
    }

    outputEl.textContent = data.sql;
  } catch (e) {
    outputEl.textContent = `Request failed: ${e.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('generateBtn');
  if (btn) btn.addEventListener('click', generateWithAI);
});
