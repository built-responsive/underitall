import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Use absolute URL for production, relative for dev
const API_BASE_URL = import.meta.env.PROD
  ? "https://its-under-it-all.replit.app/"
  : "";

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  // If URL is already absolute, use it as-is
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'omit', // Omit credentials for cross-origin requests through Shopify proxy
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(fullUrl, options);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});