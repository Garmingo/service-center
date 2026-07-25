import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@service-center/api/routers/index";
import { alerts } from "@garmingo/ui-hooks";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        alerts.danger({
          title: "Request failed",
          description: error.message,
          action: {
            label: "Retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });
}

export const queryClient = createQueryClient();

export const link = new RPCLink({
  url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"}/api/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
  headers: async () => {
    if (typeof window !== "undefined") {
      return {};
    }

    const { headers } = await import("next/headers");
    return Object.fromEntries(await headers());
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
