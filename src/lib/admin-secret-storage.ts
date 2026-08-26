const HOST_KEY = "vd-host-secret";
const ADMIN_KEY = "vd-admin-secret";

export function readStoredAdminSecret(): string {
  if (typeof window === "undefined") return "";
  return (
    sessionStorage.getItem(ADMIN_KEY) ||
    sessionStorage.getItem(HOST_KEY) ||
    localStorage.getItem(ADMIN_KEY) ||
    localStorage.getItem(HOST_KEY) ||
    ""
  );
}

export function persistAdminSecret(secret: string) {
  const value = secret.trim();
  if (!value) return;
  sessionStorage.setItem(ADMIN_KEY, value);
  sessionStorage.setItem(HOST_KEY, value);
  localStorage.setItem(ADMIN_KEY, value);
  localStorage.setItem(HOST_KEY, value);
}

export function clearStoredAdminSecret() {
  sessionStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(HOST_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(HOST_KEY);
}
