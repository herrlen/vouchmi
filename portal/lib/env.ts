const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  backendUrl: required("BACKEND_URL", "http://localhost:8000"),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
};
