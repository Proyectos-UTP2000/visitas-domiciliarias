const API_VERSION_PATH = "/api/v1";

export function normalizeApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return API_VERSION_PATH;
  }

  if (trimmed.endsWith(API_VERSION_PATH)) {
    return trimmed;
  }

  return `${trimmed}${API_VERSION_PATH}`;
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL,
  );
}

export const API_BASE_URL = getApiBaseUrl();

export const APP_NAME = "Visitas Domiciliarias";
