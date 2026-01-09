async function send() {
  const schema = document.getElementById("schema").value;
  const rows = Number(document.getElementById("rows").value);

  const res = await fetch("http://localhost:3000/generate-fake-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema, rows })
  });

  const data = await res.json();
  document.getElementById("result").value = data.sql;
}