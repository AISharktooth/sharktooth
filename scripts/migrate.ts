import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not configured");
}

async function runMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const migrationsDir = path.join(
    process.cwd(),
    "workloads/ro-assistant/db/migrations"
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log("Running migrations:");
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");

    console.log(`→ ${file}`);
    try {
      // Each migration file already wraps its own BEGIN/COMMIT to ensure transactional safety.
      await client.query(sql);
    } catch (err) {
      console.error(`Migration failed: ${file}`);
      throw err;
    }
  }

  await client.end();
  console.log("Migrations complete");
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
