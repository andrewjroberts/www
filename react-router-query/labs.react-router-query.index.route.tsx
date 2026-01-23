export default function LabIndexRoute() {
	return (
		<div className="p-4 bg-white rounded shadow">
			<h1 className="text-xl font-bold mb-4">React Router + React Query Lab</h1>
			<p className="text-gray-600 mb-4">
				This lab demonstrates the integration between React Router loaders and
				React Query caching.
			</p>
			<div className="space-y-3 text-sm">
				<div className="p-3 bg-blue-50 rounded">
					<strong>Route A:</strong> Loader prefetch strategies (none, prefetch,
					await)
				</div>
				<div className="p-3 bg-green-50 rounded">
					<strong>Route B:</strong> Mutations with optimistic updates (coming
					soon)
				</div>
			</div>
			<p className="mt-4 text-gray-500 text-sm">
				Use the config panel on the right to adjust settings and observe the
				behavior changes.
			</p>
		</div>
	);
}
