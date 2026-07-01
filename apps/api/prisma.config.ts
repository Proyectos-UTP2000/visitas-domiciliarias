import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root and current directory
dotenv.config({ path: join(__dirname, "../../.env") });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env["DATABASE_URL"]
  }
});
