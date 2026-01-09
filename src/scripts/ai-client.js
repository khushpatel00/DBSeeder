async function generateWithAI() {
  const btn = document.getElementById('generateBtn');
  const input = document.getElementById('textinput');
  const outputEl = document.getElementById('code');

  if (!input || !outputEl || !btn) return;

  const schema = input.value || '';
  const rows = 1;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  outputEl.textContent = 'Generating...';

  try {
    const res = await fetch('/generate-fake-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, rows })
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data?.error || JSON.stringify(data);
      outputEl.textContent = `Error: ${err}`;
    } else if (data && data.sql) {
      // Show generated SQL inline
      outputEl.textContent = data.sql;
    } else {
      outputEl.textContent = JSON.stringify(data, null, 2);
    }
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
