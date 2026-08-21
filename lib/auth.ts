import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { ensureDatabase, provisionUser } from "./data";
import type { Role } from "./domain";

export type Actor = { id:string; email:string; displayName:string; role:Role };

function adminEmails() {
  const value = (env as unknown as Record<string, unknown>).VLRFY_ADMIN_EMAILS;
  return typeof value === "string" ? value.split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean) : [];
}

export async function getActor(): Promise<Actor | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  await ensureDatabase();
  return provisionUser({ id:identity.userId, email:identity.email, displayName:identity.displayName, bootstrapAdmin:adminEmails().includes(identity.email.toLowerCase()) });
}
