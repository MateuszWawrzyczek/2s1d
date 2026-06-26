import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST ?? "localhost",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "pz_user",
    password: process.env.MYSQL_PASSWORD ?? "pz_pass",
    database: process.env.MYSQL_DATABASE ?? "pz_db",
  },
} satisfies Config;
