export async function api<T>(url: string, init: Omit<RequestInit, "body"> & { json?: unknown; form?: FormData } = {}): Promise<T> {
  const { json, form, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      cache: "no-store",
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
  } catch {
    throw new Error("Connexion au serveur impossible. Vérifiez votre réseau.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || `Erreur ${res.status}`), { data });
  return data as T;
}
