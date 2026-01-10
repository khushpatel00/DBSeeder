async function generateFakeSql() {
  const schemaEl = document.getElementById("textinput");
  const outputEl = document.getElementById("code");
  const generateBtn = document.getElementById("generateBtn");

  const schema = (schemaEl?.value || "").trim();
  const rows = 5;

  if (!schema) {
    if (outputEl) outputEl.textContent = "Paste or drop a SQL schema first.";
    schemaEl?.focus();
    return;
  }

  if (outputEl) outputEl.textContent = "Generating...";
  generateBtn?.setAttribute("disabled", "true");

  try {
    const res = await fetch("/generate-fake-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema, rows })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || `Request failed (${res.status})`;
      if (outputEl) outputEl.textContent = msg;
      return;
    }

    if (outputEl) outputEl.textContent = data?.sql || "";
  } catch (e) {
    if (outputEl) outputEl.textContent = "Failed to reach backend. Start it with: npm start";
  } finally {
    generateBtn?.removeAttribute("disabled");
  }
}

window.generateFakeSql = generateFakeSql;