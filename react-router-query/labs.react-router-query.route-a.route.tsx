import { useQuery } from "@tanstack/react-query";

import { fakeApi, labQueryClient, type RouteAData } from "./lab-query";
import { useLabStore } from "./lab-store";

// clientLoader runs before component renders
export async function clientLoader() {
	const { loaderStrategy, staleTime } = useLabStore.getState().config;

	const queryOptions = {
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

	if (loaderStrategy === "prefetch") {
		// Fire and forget - component renders immediately, data arrives async
		labQueryClient.prefetchQuery(queryOptions);
	} else if (loaderStrategy === "await") {
		// Block render until data is ready
		await labQueryClient.fetchQuery(queryOptions);
	}
	// "none" - do nothing, let component fetch

	return null;
}

export default function RouteA() {
	const config = useLabStore((s) => s.config);

	const { data, isFetching, isStale, isLoading, error } = useQuery({
		queryKey: ["lab", "route-a"],
		queryFn: (): Promise<RouteAData> =>
			fakeApi(
				{
					title: "Route A Data",
					timestamp: Date.now(),
					items: ["Item 1", "Item 2", "Item 3"],
				},
				"route-a",
			),
		staleTime: config.staleTime,
	});

	return (
		<div className="p-4 bg-white rounded shadow">
			<h1 className="text-xl font-bold mb-4">Route A - Loader Prefetch Demo</h1>

			{/* Status badges */}
			<div className="flex gap-2 mb-4">
				<Badge label="Loading" active={isLoading} color="blue" />
				<Badge label="Fetching" active={isFetching} color="yellow" />
				<Badge label="Stale" active={isStale} color="orange" />
				<Badge label="Error" active={!!error} color="red" />
			</div>

			{/* Data display */}
			{data ? (
				<div className="p-3 bg-gray-50 rounded font-mono text-sm">
					<pre>{JSON.stringify(data, null, 2)}</pre>
				</div>
			) : isLoading ? (
				<div className="p-3 bg-gray-50 rounded animate-pulse">Loading...</div>
			) : null}

			{error && (
				<div className="p-3 bg-red-50 text-red-700 rounded mt-2">
					{(error as Error).message}
				</div>
			)}
		</div>
	);
}

function Badge({
	label,
	active,
	color,
}: {
	label: string;
	active: boolean;
	color: "blue" | "yellow" | "orange" | "red";
}) {
	const colors = {
		blue: "bg-blue-100 text-blue-700",
		yellow: "bg-yellow-100 text-yellow-700",
		orange: "bg-orange-100 text-orange-700",
		red: "bg-red-100 text-red-700",
	};
	return (
		<span
			className={`px-2 py-0.5 rounded text-xs font-medium ${
				active ? colors[color] : "bg-gray-100 text-gray-400"
			}`}
		>
			{label}
		</span>
	);
}
