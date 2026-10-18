import "server-only";
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;

export interface DbInfo {
  driver: "neon" | "pglite";
  description: string;
}

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Holder = { db: Db; info: DbInfo; ready: Promise<void> };

/**
 * PGlite is single-process: two servers writing one data directory can corrupt it.
 * A lock file holding the owner's PID turns that into a clear error instead.
 */
function claimLock(dir: string) {
  const lock = `${dir}.lock`;
  try {
    const pid = Number(fs.readFileSync(lock, "utf8"));
    if (pid && pid !== process.pid) {
      let alive = false;
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
      if (alive) {
        throw new Error(`Another AGENT FROG server (process ${pid}) is using the local database at ${dir}. Stop it, or set PGLITE_DIR to a different folder.`);
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  fs.writeFileSync(lock, String(process.pid));
}
const g = globalThis as unknown as { __offerreadyDb?: Holder };

function create(): Holder {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Neon serverless Postgres over HTTP. Schema is applied with `npm run db:migrate`.
    const db = drizzleNeon(neon(url), { schema }) as unknown as Db;
    return {
      db,
      info: { driver: "neon", description: `Neon Postgres (${new URL(url).hostname})` },
      ready: Promise.resolve(),
    };
  }
  // No DATABASE_URL: an embedded Postgres stored on disk, so the app runs fully offline.
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  claimLock(dir);
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  return {
    db,
    info: { driver: "pglite", description: "Local embedded Postgres (PGlite). Set DATABASE_URL to use Neon." },
    ready: migratePglite(db, { migrationsFolder: MIGRATIONS }),
  };
}

function holder(): Holder {
  if (!g.__offerreadyDb) g.__offerreadyDb = create();
  return g.__offerreadyDb;
}

/** Returns the database once migrations (local mode) have completed. */
export async function getDb(): Promise<Db> {
  const h = holder();
  try {
    await h.ready;
  } catch (e) {
    g.__offerreadyDb = undefined; // let the next request retry instead of caching the failure
    throw e;
  }
  return h.db;
}

export function dbInfo(): DbInfo {
  return holder().info;
}

export { schema };
