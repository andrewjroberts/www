import { QueryClientProvider } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigation } from "react-router";

import { labQueryClient } from "./lab-query";
import { useLabStore } from "./lab-store";

export default function LabRoute() {
	return (
		<QueryClientProvider client={labQueryClient}>
			<div className="grid grid-cols-[1fr_400px] w-full h-full">
				{/* Main content */}
				<div className="flex flex-col p-6 gap-4">
					<Nav />
					<div className="flex-1">
						<Outlet />
					</div>
					<StateObserver />
				</div>

				{/* Config sidebar */}
				<ConfigPanel />
			</div>
		</QueryClientProvider>
	);
}

function Nav() {
	const location = useLocation();
	const isActive = (path: string) => location.pathname === path;

	return (
		<nav className="flex gap-2">
			<NavLink to="/labs/react-router-query" active={isActive("/labs/react-router-query")}>
				Index
			</NavLink>
			<NavLink to="/labs/react-router-query/a" active={isActive("/labs/react-router-query/a")}>
				Route A
			</NavLink>
			<NavLink to="/labs/react-router-query/b" active={isActive("/labs/react-router-query/b")}>
				Route B
			</NavLink>
		</nav>
	);
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: string }) {
	return (
		<Link
			to={to}
			className={`px-3 py-1 rounded transition-colors ${
				active ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
			}`}
		>
			{children}
		</Link>
	);
}

function StateObserver() {
	const navigation = useNavigation();
	const location = useLocation();

	return (
		<div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm rounded space-y-1">
			<div className="text-gray-400 text-xs uppercase tracking-wide mb-2">State Observer</div>
			<div>
				navigation.state:{" "}
				<span
					className={
						navigation.state === "idle"
							? "text-green-400"
							: navigation.state === "loading"
								? "text-yellow-400"
								: "text-orange-400"
					}
				>
					{navigation.state}
				</span>
			</div>
			<div>
				location: <span className="text-blue-400">{location.pathname}</span>
			</div>
		</div>
	);
}

function ConfigPanel() {
	const config = useLabStore((s) => s.config);
	const actions = useLabStore((s) => s.actions);

	return (
		<div className="flex flex-col bg-gray-100 border-l p-4 gap-4 overflow-y-auto">
			<h2 className="font-bold text-lg">Config</h2>

			{/* Network Delay */}
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium">
					Network Delay: <span className="font-mono">{config.networkDelay}ms</span>
				</span>
				<input
					type="range"
					min={0}
					max={5000}
					step={100}
					value={config.networkDelay}
					onChange={(e) => actions.setNetworkDelay(+e.target.value)}
					className="w-full"
				/>
				<div className="flex justify-between text-xs text-gray-500">
					<span>0ms</span>
					<span>5000ms</span>
				</div>
			</label>

			{/* Stale Time */}
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium">
					Stale Time: <span className="font-mono">{config.staleTime}ms</span>
				</span>
				<input
					type="range"
					min={0}
					max={60000}
					step={1000}
					value={config.staleTime}
					onChange={(e) => actions.setStaleTime(+e.target.value)}
					className="w-full"
				/>
				<div className="flex justify-between text-xs text-gray-500">
					<span>0ms</span>
					<span>60s</span>
				</div>
			</label>

			{/* Error Rate */}
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium">
					Error Rate: <span className="font-mono">{config.errorRate}%</span>
				</span>
				<input
					type="range"
					min={0}
					max={100}
					step={5}
					value={config.errorRate}
					onChange={(e) => actions.setErrorRate(+e.target.value)}
					className="w-full"
				/>
				<div className="flex justify-between text-xs text-gray-500">
					<span>0%</span>
					<span>100%</span>
				</div>
			</label>

			{/* Loader Strategy */}
			<fieldset className="flex flex-col gap-2">
				<legend className="text-sm font-medium mb-1">Loader Strategy</legend>
				{(["none", "prefetch", "await"] as const).map((strategy) => (
					<label key={strategy} className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="loaderStrategy"
							value={strategy}
							checked={config.loaderStrategy === strategy}
							onChange={() => actions.setLoaderStrategy(strategy)}
							className="w-4 h-4"
						/>
						<span className="text-sm">{strategy}</span>
						<span className="text-xs text-gray-500">
							{strategy === "none" && "— component fetches"}
							{strategy === "prefetch" && "— fire & forget"}
							{strategy === "await" && "— block render"}
						</span>
					</label>
				))}
			</fieldset>

			{/* Help text */}
			<div className="mt-4 p-3 bg-gray-200 rounded text-xs text-gray-600 space-y-2">
				<p>
					<strong>Network Delay:</strong> Simulates API latency.
				</p>
				<p>
					<strong>Stale Time:</strong> How long data is considered fresh.
				</p>
				<p>
					<strong>Error Rate:</strong> % of requests that fail.
				</p>
				<p>
					<strong>Loader Strategy:</strong> When to fetch data relative to navigation.
				</p>
			</div>
		</div>
	);
}
