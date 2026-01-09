import 'dotenv/config';
import express from "express";
import cors from "cors";
import { faker } from "@faker-js/faker";
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files (index.html, scripts, assets) from project root
const staticDir = path.join(process.cwd());
app.use(express.static(staticDir));

// Root route: serve index.html to ensure frontend is served from the same origin
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Handle invalid JSON body parse errors from `express.json()`
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Invalid JSON received:", err.message);
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next(err);
});

console.log("🚀 Backend starting...");

/* =========================
   SCHEMA PARSER
========================= */
function parseSchema(sql) {
  const tables = {};
  const regex = /CREATE TABLE\s+public\.(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    tables[tableName] = [];

    body.split(",").forEach(line => {
      line = line.trim();
      if (line === "" || line.startsWith("CONSTRAINT") || line.startsWith("PRIMARY") || line.startsWith("FOREIGN")) return;

      const col = line.split(/\s+/)[0].replace(/[(),;]/g, "");
      if (col) tables[tableName].push(col);
    });
  }

  return tables;
}

/* =========================
   FAKER VALUE GENERATOR
========================= */
function fakeValue(column) {
  const c = column.toLowerCase();

  if (c.includes("name")) return `'${faker.person.fullName()}'`;
  if (c.includes("email")) return `'${faker.internet.email()}'`;
  if (c.includes("phone")) return `'${faker.phone.number()}'`;
  if (c.includes("address")) return `'${faker.location.streetAddress()}'`;
  if (c.includes("date")) return `'${faker.date.past().toISOString().split("T")[0]}'`;
  if (c.includes("price") || c.includes("amount")) return faker.number.int({ min: 10, max: 500 });

  return faker.number.int({ min: 1, max: 1000 });
}

/* =========================
   API ENDPOINT
========================= */
app.post("/generate-fake-data", (req, res) => {
  faker.seed(Date.now());

  // defensively handle missing/undefined req.body to avoid crashes
  const { schema, rows = 5 } = req.body || {};

  if (!schema) {
    return res.status(400).json({ error: "Schema is required" });
  }

  const parsed = parseSchema(schema);
  let sqlOutput = "";

  for (const table in parsed) {
    const columns = parsed[table];
    if (columns.length === 0) continue;

    sqlOutput += `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n`;

    const values = [];
    for (let i = 0; i < rows; i++) {
      const row = columns.map(col => fakeValue(col));
      values.push(`(${row.join(", ")})`);
    }

    sqlOutput += values.join(",\n") + ";\n\n";
  }

  res.json({ sql: sqlOutput });
});

/* =========================
   START SERVER
========================= */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
