import express from "express";
import cors from "cors";
import { faker } from "@faker-js/faker";

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- PARSE SCHEMA ---------- */
function parseSchema(sql) {
  const tables = sql.split("CREATE TABLE").slice(1);
  const schema = {};

  tables.forEach(block => {
    const table = block.match(/public\.(\w+)/)?.[1];
    if (!table) return;

    schema[table] = {
      columns: [],
      foreignKeys: {}
    };

    block.split("\n").forEach(line => {
      line = line.trim();

      if (/^\w+\s/.test(line) && !line.startsWith("CONSTRAINT")) {
        schema[table].columns.push(line.split(" ")[0]);
      }

      if (line.includes("FOREIGN KEY")) {
        const fk = line.match(
          /FOREIGN KEY \((\w+)\).*public\.(\w+)\((\w+)\)/
        );
        if (fk) schema[table].foreignKeys[fk[1]] = `${fk[2]}.${fk[3]}`;
      }
    });
  });

  return schema;
}

/* ---------- GENERATE FAKE DATA ---------- */
function fakeValue(column) {
  if (column.includes("name")) return `'${faker.person.fullName()}'`;
  if (column.includes("phone")) return `'${faker.phone.number()}'`;
  if (column.includes("address")) return `'${faker.location.streetAddress()}'`;
  if (column.includes("date")) return `'${faker.date.past().toISOString().split("T")[0]}'`;
  if (column.includes("amount") || column.includes("price")) return faker.number.int({ min: 10, max: 500 });
  return faker.number.int({ min: 1, max: 100 });
}

/* ---------- API ---------- */
app.post("/generate-fake-data", (req, res) => {
  const { schema: sql, rows = 5 } = req.body;

  const parsed = parseSchema(sql);
  let output = "";

  for (const table in parsed) {
    const cols = parsed[table].columns;

    output += `INSERT INTO ${table} (${cols.join(", ")}) VALUES\n`;

    const values = [];
    for (let i = 0; i < rows; i++) {
      const row = cols.map(c => fakeValue(c));
      values.push(`(${row.join(", ")})`);
    }

    output += values.join(",\n") + ";\n\n";
  }

  res.json({ sql: output });
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
  console.log("Backend running on port 3000");
});
