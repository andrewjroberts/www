import { QueryClient } from "@tanstack/react-query";
import { useLabStore } from "./lab-store";

export const labQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5000,
			retry: false,
		},
	},
});

/**
 * Fake API with configurable delay and error simulation.
 * Reads config from Zustand store.
 */
export async function fakeApi<T>(data: T, label?: string): Promise<T> {
	const { networkDelay, errorRate } = useLabStore.getState().config;

	console.log(
		`[Lab API] ${label ?? "request"} starting (delay: ${networkDelay}ms)`,
	);

	await new Promise((resolve) => setTimeout(resolve, networkDelay));

	if (Math.random() * 100 < errorRate) {
		console.log(`[Lab API] ${label ?? "request"} FAILED (simulated error)`);
		throw new Error(`Simulated error for ${label ?? "request"}`);
	}

	console.log(`[Lab API] ${label ?? "request"} completed`);
	return data;
}

// Route A data type
export type RouteAData = {
	title: string;
	timestamp: number;
	items: string[];
};

// Query options factory (TanStack Query v5 pattern)
export const labQueries = {
	routeA: () => {
		const { staleTime } = useLabStore.getState().config;
		return {
			queryKey: ["lab", "route-a"] as const,
			queryFn: (): Promise<RouteAData> =>
				fakeApi(
					{
						title: "Route A Data",
						timestamp: Date.now(),
						items: ["Item 1", "Item 2", "Item 3"],
					},
					"route-a",
				),
			staleTime,
		};
	},
};
