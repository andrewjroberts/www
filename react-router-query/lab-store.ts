import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type LoaderStrategy = "none" | "prefetch" | "await";

export type LabConfig = {
	networkDelay: number; // 0-5000ms
	staleTime: number; // 0-60000ms
	errorRate: number; // 0-100%
	loaderStrategy: LoaderStrategy;
};

export type LabState = {
	config: LabConfig;
};

export type LabActions = {
	actions: {
		setNetworkDelay: (ms: number) => void;
		setStaleTime: (ms: number) => void;
		setErrorRate: (rate: number) => void;
		setLoaderStrategy: (strategy: LoaderStrategy) => void;
	};
};

export const initialLabConfig: LabConfig = {
	networkDelay: 1000,
	staleTime: 5000,
	errorRate: 0,
	loaderStrategy: "prefetch",
};

export const useLabStore = create<LabState & LabActions>()(
	devtools(
		immer((set) => ({
			config: initialLabConfig,
			actions: {
				setNetworkDelay: (ms) =>
					set((s) => {
						s.config.networkDelay = ms;
					}),
				setStaleTime: (ms) =>
					set((s) => {
						s.config.staleTime = ms;
					}),
				setErrorRate: (rate) =>
					set((s) => {
						s.config.errorRate = rate;
					}),
				setLoaderStrategy: (strategy) =>
					set((s) => {
						s.config.loaderStrategy = strategy;
					}),
			},
		})),
		{ name: "rr-rq-lab" },
	),
);

export const useLabActions = () => useLabStore((state) => state.actions);
export const useLabConfig = () => useLabStore((state) => state.config);
