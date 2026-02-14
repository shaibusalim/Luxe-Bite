
import { neon } from "@neondatabase/serverless";
import { config } from "./server/config.js";

const sql = neon(config.DATABASE_URL);

async function listAll() {
  try {
    console.log("--- Tables ---");
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log(tables.map(t => t.table_name));

    for (const table of tables) {
      const name = table.table_name;
      console.log(`\n--- Constraints for ${name} ---`);
      const constraints = await sql`
        SELECT
            conname AS constraint_name,
            contype AS constraint_type,
            pg_get_constraintdef(c.oid) AS constraint_definition
        FROM
            pg_constraint c
        JOIN
            pg_namespace n ON n.oid = c.connamespace
        JOIN
            pg_class cl ON cl.oid = c.conrelid
        WHERE
            n.nspname = 'public'
            AND cl.relname = ${name}
      `;
      console.log(constraints);
    }
  } catch (e) {
    console.error(e);
  }
}

listAll();
