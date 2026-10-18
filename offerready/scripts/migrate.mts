// Applies the SQL migrations in ./drizzle to the database in DATABASE_URL (Neon).
// Local PGlite databases migrate themselves on first use, so this is only needed for Neon.
// Run: npm run db:migrate
import "dotenv/config";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL isn't set. Put your Neon connection string in .env.local first.");
  process.exit(1);
}
await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log(`Migrations applied to ${new URL(url).hostname}.`);
