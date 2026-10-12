export function readAuthSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AUTH_SECRET;
  if (env.NODE_ENV === "production" && (!secret || secret.length < 32 || secret === "replace-with-at-least-32-random-characters" || secret === "valrify-development-secret-change-me")) {
    throw new Error("Production requires a unique AUTH_SECRET of at least 32 characters.");
  }
  return secret || "valrify-development-secret-change-me";
}

export const isDemoAccount = (user: { id: string; email: string }) => user.id.startsWith("demo-") || /\.(local|invalid)$/i.test(user.email);
