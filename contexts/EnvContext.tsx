import React, { createContext, useContext, useEffect, useState } from "react";
import { getEnv } from "../services/env";

type EnvContextType = {
  geminiApiKey: string | null;
};

const EnvContext = createContext<EnvContextType>({
  geminiApiKey: null,
});

export const EnvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);

  useEffect(() => {
    getEnv("GEMINI_API_KEY").then(setGeminiApiKey);
  }, []);

  return (
    <EnvContext.Provider value={{ geminiApiKey }}>
      {children}
    </EnvContext.Provider>
  );
};

export const useEnv = () => useContext(EnvContext);
