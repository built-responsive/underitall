
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Use relative URLs in dev (hits localhost:5000), absolute in prod (for Shopify iframe)
  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? '' : 'https://its-under-it-all.replit.app';
  const fullPath = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`🌐 [${isDev ? 'DEV' : 'PROD'}] API Request: ${method} ${fullPath}`);
  return fetch(fullPath, options);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const isDev = import.meta.env.DEV;
    const baseUrl = isDev ? '' : 'https://its-under-it-all.replit.app';
    
    const path = queryKey.join("/");
    const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    
    console.log(`🔍 [${isDev ? 'DEV' : 'PROD'}] Query Fetch: ${fullUrl}`);
    
    const res = await fetch(fullUrl, {
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
