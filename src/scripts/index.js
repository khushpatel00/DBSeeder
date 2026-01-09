import express from "express";
import cors from "cors";
import { faker } from "@faker-js/faker";

console.log("Starting backend..."); // 👈 MUST print

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

    schema[table] = { columns: [], foreignKeys: {} };

    const columnBlock = block.split("(")[1]?.split(")")[0];
    if (columnBlock) {
      columnBlock.split(",").forEach(col => {
        const name = col.trim().split(" ")[0];
        if (!["CONSTRAINT", "PRIMARY", "FOREIGN"].includes(name)) {
          schema[table].columns.push(name);
        }
      });
    }
  });

  return schema;
}

/* ---------- FAKE VALUE ---------- */
function fakeValue(col) {
  if (col.includes("name")) return `'${faker.person.fullName()}'`;
  if (col.includes("phone")) return `'${faker.phone.number()}'`;
  return faker.number.int({ min: 1, max: 100 });
}

/* ---------- ROUTE ---------- */
app.post("/generate-fake-data", (req, res) => {
  const parsed = parseSchema(req.body.schema);
  let sql = "";

  for (const t in parsed) {
    const c = parsed[t].columns;
    sql += `INSERT INTO ${t} (${c.join(", ")}) VALUES\n`;
    sql += `(${c.map(fakeValue).join(", ")});\n\n`;
  }

  res.json({ sql });
});

/* ---------- START SERVER ---------- */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
