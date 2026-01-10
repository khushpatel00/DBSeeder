import 'dotenv/config';
import express from "express";
import cors from "cors";
import { faker } from "@faker-js/faker";
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

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
function splitTopLevelCommaSeparated(input) {
  const parts = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      const trimmed = buf.trim();
      if (trimmed) parts.push(trimmed);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const trimmed = buf.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}

function normalizeIdent(ident) {
  return ident?.replace(/^["`[]|["`\]]$/g, '');
}

function parseSchema(sql) {
  /** @type {Record<string, { name: string, columns: Array<{name: string, type: string, notNull: boolean, primaryKey: boolean, references?: {table: string, column: string}}>, foreignKeys: Array<{columns: string[], refTable: string, refColumns: string[]}> }>} */
  const tables = {};
  const createRegex = /CREATE TABLE\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  let match;

  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const parts = splitTopLevelCommaSeparated(body);

    const table = {
      name: tableName,
      columns: [],
      foreignKeys: []
    };

    for (const rawPart of parts) {
      const line = rawPart.trim().replace(/\s+/g, ' ');
      if (!line) continue;

      // Table-level FK constraint
      // Example: CONSTRAINT fk_name FOREIGN KEY (customer_id) REFERENCES public.customers(id)
      const fkMatch = line.match(/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:public\.)?(\w+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const cols = fkMatch[1].split(',').map(s => normalizeIdent(s.trim()));
        const refTable = fkMatch[2];
        const refCols = fkMatch[3].split(',').map(s => normalizeIdent(s.trim()));
        table.foreignKeys.push({ columns: cols, refTable, refColumns: refCols });
        continue;
      }

      // Table-level PK constraint
      // Example: PRIMARY KEY (id)
      const pkMatch = line.match(/^PRIMARY KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map(s => normalizeIdent(s.trim()));
        for (const col of table.columns) {
          if (pkCols.includes(col.name)) col.primaryKey = true;
        }
        continue;
      }

      // Ignore other constraints
      if (/^CONSTRAINT\s+/i.test(line) || /^UNIQUE\s+/i.test(line) || /^CHECK\s+/i.test(line)) {
        continue;
      }

      // Column definition
      // Example: customer_id uuid NOT NULL REFERENCES public.customers(id)
      const tokens = line.split(' ');
      const colName = normalizeIdent(tokens[0]);
      if (!colName) continue;

      const stopWords = new Set(['not', 'null', 'default', 'primary', 'references', 'constraint', 'unique', 'check', 'collate']);
      const typeParts = [];
      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (stopWords.has(t.toLowerCase())) break;
        typeParts.push(t);
      }
      const type = (typeParts.join(' ') || '').toLowerCase();
      const notNull = /\bNOT NULL\b/i.test(line);
      const primaryKey = /\bPRIMARY KEY\b/i.test(line);

      /** @type {{table: string, column: string} | undefined} */
      let references;
      const inlineRef = line.match(/REFERENCES\s+(?:public\.)?(\w+)\s*\((\w+)\)/i);
      if (inlineRef) {
        references = { table: inlineRef[1], column: inlineRef[2] };
      }

      table.columns.push({ name: colName, type, notNull, primaryKey, references });
    }

    // Apply table-level FKs onto columns
    for (const fk of table.foreignKeys) {
      fk.columns.forEach((col, idx) => {
        const refCol = fk.refColumns[idx] || fk.refColumns[0];
        const target = table.columns.find(c => c.name === col);
        if (target && !target.references) target.references = { table: fk.refTable, column: refCol };
      });
    }

    tables[tableName] = table;
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

function escapeSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function formatTimestamp(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  // Use UTC to avoid local timezone surprises
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function typeCategory(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('uuid')) return 'uuid';
  if (t.includes('timestamp')) return 'timestamp';
  if (t === 'date' || t.includes(' date')) return 'date';
  if (t.includes('time')) return 'time';
  if (t.includes('char') || t.includes('text') || t.includes('varchar')) return 'text';
  if (t.includes('bool')) return 'boolean';
  if (t.includes('int') || t.includes('serial') || t.includes('numeric') || t.includes('decimal') || t.includes('real') || t.includes('double')) return 'number';
  return 'unknown';
}

function topoSortTables(tables) {
  const names = Object.keys(tables);
  const deps = new Map();
  const indeg = new Map();
  for (const name of names) {
    deps.set(name, new Set());
    indeg.set(name, 0);
  }

  for (const name of names) {
    const table = tables[name];
    for (const col of table.columns) {
      const ref = col.references;
      if (ref && tables[ref.table]) {
        deps.get(name).add(ref.table);
      }
    }
  }

  // Build indegrees: edge refTable -> name (ref must come first)
  for (const name of names) {
    for (const ref of deps.get(name)) {
      indeg.set(name, (indeg.get(name) || 0) + 1);
    }
  }

  const queue = [];
  for (const name of names) {
    if ((indeg.get(name) || 0) === 0) queue.push(name);
  }

  const ordered = [];
  while (queue.length) {
    const n = queue.shift();
    ordered.push(n);
    for (const other of names) {
      if (deps.get(other).has(n)) {
        indeg.set(other, (indeg.get(other) || 0) - 1);
        deps.get(other).delete(n);
        if ((indeg.get(other) || 0) === 0) queue.push(other);
      }
    }
  }

  // If cycle/unknown, append remaining in original order
  const remaining = names.filter(n => !ordered.includes(n));
  return [...ordered, ...remaining];
}

function makeSqlLiteralFromType({ columnName, type, rawValue }) {
  const category = typeCategory(type);
  const name = (columnName || '').toLowerCase();

  if (rawValue === null || rawValue === undefined) return 'NULL';

  if (category === 'uuid') return escapeSqlString(rawValue);
  if (category === 'timestamp') return escapeSqlString(formatTimestamp(rawValue));
  if (category === 'date') return escapeSqlString(formatTimestamp(rawValue).split(' ')[0]);
  if (category === 'time') return escapeSqlString(formatTimestamp(rawValue).split(' ')[1]);
  if (category === 'boolean') return rawValue ? 'TRUE' : 'FALSE';
  if (category === 'number') return Number.isFinite(Number(rawValue)) ? String(Number(rawValue)) : '0';

  // Force these to text as per your import errors
  if (name === 'delivery_time' || name === 'payment_method') return escapeSqlString(rawValue);

  // Default to quoted text
  return escapeSqlString(rawValue);
}

function generateFakeRow({ tableName, tableSchema, tables, generated, rowsSoFar }) {
  /** @type {Record<string, any>} */
  const row = {};

  for (const col of tableSchema.columns) {
    const colName = col.name;
    const colType = col.type;
    const cat = typeCategory(colType);
    const lower = colName.toLowerCase();

    // Special rule: payments.customer_name must match an existing customers.name
    if (tableName.toLowerCase() === 'payments' && lower === 'customer_name') {
      const customers = generated['customers'] || [];
      if (customers.length) {
        row[colName] = customers[Math.floor(Math.random() * customers.length)]?.name ?? faker.person.fullName();
      } else {
        row[colName] = faker.person.fullName();
      }
      continue;
    }

    // Foreign key value from already generated referenced rows
    if (col.references && tables[col.references.table]) {
      const refTable = col.references.table;
      const refColumn = col.references.column;
      const refRows = generated[refTable] || [];
      const pick = refRows.length ? refRows[Math.floor(Math.random() * refRows.length)] : null;
      if (pick && pick[refColumn] !== undefined) {
        row[colName] = pick[refColumn];
        continue;
      }

      // If ref rows not available, use NULL if allowed
      if (!col.notNull) {
        row[colName] = null;
        continue;
      }
      // fall through to generate something
    }

    if (cat === 'uuid') {
      row[colName] = faker.string.uuid();
      continue;
    }

    if (cat === 'timestamp' || cat === 'date' || cat === 'time') {
      row[colName] = faker.date.recent({ days: 30 });
      continue;
    }

    if (cat === 'boolean') {
      row[colName] = faker.datatype.boolean();
      continue;
    }

    if (cat === 'number') {
      // Business logic: total_amount = (quantity_ml / 1000) * price_per_liter
      if (lower === 'total_amount' && row['quantity_ml'] && row['price_per_liter']) {
        row[colName] = Math.round((row['quantity_ml'] / 1000) * row['price_per_liter'] * 100) / 100;
        continue;
      }

      // Basic heuristics
      if (lower.includes('price') || lower.includes('cost')) {
        row[colName] = faker.number.int({ min: 50, max: 500 });
      } else if (lower.includes('quantity') || lower.includes('volume')) {
        row[colName] = faker.number.int({ min: 500, max: 5000 });
      } else if (lower.includes('amount')) {
        // For other amount fields not covered by total_amount calculation
        row[colName] = faker.number.int({ min: 10, max: 500 });
      } else if (col.primaryKey || lower.endsWith('_id')) {
        // Ensure unique IDs for primary keys and _id columns
        row[colName] = rowsSoFar + 1;
      } else {
        row[colName] = faker.number.int({ min: 1, max: 1000 });
      }
      continue;
    }

    // Text-ish heuristics
    if (lower.includes('email')) row[colName] = faker.internet.email();
    else if (lower.includes('phone')) row[colName] = faker.phone.number();
    else if (lower.includes('address')) row[colName] = faker.location.streetAddress();
    else if (lower.includes('name')) row[colName] = faker.person.fullName();
    else if (lower.includes('method')) row[colName] = faker.helpers.arrayElement(['cash', 'card', 'upi', 'netbanking']);
    else if (lower.includes('time')) row[colName] = faker.helpers.arrayElement(['10:00', '12:30', '15:45', '18:15']);
    else row[colName] = faker.lorem.words({ min: 1, max: 3 });
  }

  return row;
}

async function fixSqlWithOpenAI({ schema, sql, dialect = 'postgres' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { sql, usedAI: false };

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const prompt = [
    `Dialect: ${dialect}`,
    'Fix the INSERT statements to execute cleanly against the schema.',
    'Rules:',
    '- uuid columns must be UUID strings',
    '- text/varchar columns must be quoted strings',
    '- timestamp/date/time must be properly formatted strings',
    '- foreign keys must reference existing rows',
    '- payments.customer_name must match an existing customers.name when present',
    '- Ensure NO DUPLICATE PRIMARY KEYS across rows',
    '- Validate business logic: total_amount = (quantity_ml / 1000) * price_per_liter',
    '- CRITICAL: All foreign key types must match their referenced primary key types (INT→INT, UUID→UUID)',
    '- Ensure consistent ID types: if customers.id is INT, customer_id in other tables must also be INT (not UUID)',
    'Output ONLY SQL. No markdown. No explanations.',
    '--- SCHEMA ---',
    schema,
    '--- INSERTS ---',
    sql
  ].join('\n');

  const resp = await client.responses.create({
    model,
    input: prompt
  });

  const text = resp.output_text?.trim();
  if (!text) return { sql, usedAI: false };
  return { sql: text, usedAI: true };
}

/* =========================
   API ENDPOINT
========================= */
app.post("/generate-fake-data", (req, res) => {
  faker.seed(Date.now());

  // defensively handle missing/undefined req.body to avoid crashes
  const { schema, rows = 5, ai = false, dialect = 'postgres' } = req.body || {};

  if (!schema) {
    return res.status(400).json({ error: "Schema is required" });
  }

  const tables = parseSchema(schema);
  const order = topoSortTables(tables);
  /** @type {Record<string, Array<Record<string, any>>>} */
  const generated = {};

  let sqlOutput = "";
  for (const tableName of order) {
    const table = tables[tableName];
    if (!table || !table.columns.length) continue;

    generated[tableName] = generated[tableName] || [];
    const columns = table.columns.map(c => c.name);

    sqlOutput += `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES\n`;

    const tuples = [];
    for (let i = 0; i < rows; i++) {
      const rowObj = generateFakeRow({ tableName, tableSchema: table, tables, generated, rowsSoFar: i });
      
      // Validate business logic: total_amount = (quantity_ml / 1000) * price_per_liter
      if (tableName.toLowerCase().includes('product') && rowObj['total_amount'] && 
          rowObj['quantity_ml'] && rowObj['price_per_liter']) {
        const calculated = Math.round((rowObj['quantity_ml'] / 1000) * rowObj['price_per_liter'] * 100) / 100;
        rowObj['total_amount'] = calculated;
      }
      
      generated[tableName].push(rowObj);

      const values = table.columns.map(col => {
        const rawValue = rowObj[col.name];
        return makeSqlLiteralFromType({ columnName: col.name, type: col.type, rawValue });
      });
      tuples.push(`(${values.join(", ")})`);
    }

    sqlOutput += tuples.join(",\n") + ";\n\n";
  }

  if (ai) {
    fixSqlWithOpenAI({ schema, sql: sqlOutput, dialect })
      .then(result => res.json({ sql: result.sql, usedAI: result.usedAI }))
      .catch(err => {
        console.error('OpenAI fix failed:', err?.message || err);
        res.json({ sql: sqlOutput, usedAI: false });
      });
    return;
  }

  res.json({ sql: sqlOutput, usedAI: false });
});

app.post('/ai-fix-sql', async (req, res) => {
  const { schema, sql, dialect = 'postgres' } = req.body || {};
  if (!schema || !sql) return res.status(400).json({ error: 'schema and sql are required' });
  try {
    const result = await fixSqlWithOpenAI({ schema, sql, dialect });
    res.json({ sql: result.sql, usedAI: result.usedAI });
  } catch (e) {
    console.error('OpenAI route failed:', e?.message || e);
    // Degrade gracefully when no/invalid key
    res.json({ sql, usedAI: false });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
