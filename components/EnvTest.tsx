import { useEffect, useState } from "react";
import { getEnv } from "../services/env";

const EnvTest: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getEnv("GEMINI_API_KEY").then(setApiKey);
  }, []);

  return (
    <div className="p-4 border border-gray-600 rounded">
      API Key: {apiKey ? "geladen ✅" : "nicht gefunden ⚠️"}
    </div>
  );
};

export default EnvTest;
