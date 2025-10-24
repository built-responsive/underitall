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
  path: string,
  body?: any,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Use relative URLs in dev (hits local server), absolute in prod (for embedded Shopify iframe)
  const baseUrl = import.meta.env.PROD 
    ? 'https://its-under-it-all.replit.app'
    : ''; // Empty string = relative to current origin (localhost:5000 in dev)
  
  const fullPath = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`🌐 API Request: ${method} ${fullPath}`); // Debug log
  return fetch(fullPath, options);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use relative URLs in dev, absolute in prod
    const baseUrl = import.meta.env.PROD
      ? 'https://its-under-it-all.replit.app'
      : ''; // Relative in dev
    
    const path = queryKey.join("/");
    const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    
    console.log(`🔍 Query Fetch: ${fullUrl}`); // Debug log
    
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