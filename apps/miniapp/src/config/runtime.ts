export const MOCK_ENABLED = import.meta.env.VITE_MOCK_ENABLED === "true";
export const STORAGE_PREFIX = MOCK_ENABLED ? "mock:v1:" : "";
