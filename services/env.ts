// src/services/env.ts
export async function getEnv(key: string): Promise<string | null> {
  if (typeof window !== "undefined" && "electronAPI" in window) {
    return await (window as any).electronAPI.getEnv(key);
  }
  return null;
}
