function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function validateJournalEnv() {
  const required = [
    "DRME_DATABASE_URL",
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ];
  required.forEach(requireEnv);
}

export const journalEnv = {
  get databaseUrl() { return requireEnv("DRME_DATABASE_URL"); },
  get firebaseProjectId() { return requireEnv("FIREBASE_ADMIN_PROJECT_ID"); },
  get firebaseClientEmail() { return requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"); },
  get firebasePrivateKey() { return requireEnv("FIREBASE_ADMIN_PRIVATE_KEY"); },
  get openaiApiKey() { return process.env.OPENAI_API_KEY ?? ""; },
  get nodeEnv() { return process.env.NODE_ENV ?? "development"; },
  get isDev() { return this.nodeEnv === "development"; },
};
