// Acceso a la API del servidor. La sesión viaja sola en una cookie, así que
// no hace falta mandar ningún token a mano.

export const SESION_VENCIDA = "vet:sesion-vencida";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Devuelve el JSON de la respuesta o lanza un ApiError con el mensaje del servidor.
export async function api<T = any>(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Si la sesión venció en medio del uso, AuthContext cierra la sesión local
    if (res.status === 401 && !url.startsWith("/api/auth/")) {
      window.dispatchEvent(new Event(SESION_VENCIDA));
    }
    throw new ApiError(data?.error || "Ocurrió un error. Intentá nuevamente.", res.status);
  }
  return data as T;
}
