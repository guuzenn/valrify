import "./src/load-env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({schema:"./src/database/schema.ts",out:"./drizzle",dialect:"postgresql",dbCredentials:{url:process.env.DATABASE_URL??"postgresql://valrify:valrify_dev@localhost:5434/valrify"}});
