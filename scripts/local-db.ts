import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve(".data/postgres");
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  user: "eventiq",
  password: "eventiq_local_only",
  port: 54329,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(resolve(directory, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'eventiq_utf8'",
);
if (!result.rowCount)
  await client.query(
    "CREATE DATABASE eventiq_utf8 TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'",
  );
await client.end();
console.log(
  "EventIQ PostgreSQL ready at 127.0.0.1:54329. Data persists in .data/postgres.",
);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
