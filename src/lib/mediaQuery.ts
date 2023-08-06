export const defineScreen = () => {
	const screens = {
		isMd: window.matchMedia('(min-width: 768px)').matches,
		isLg: window.matchMedia('(min-width: 1024px)').matches,
		isXl: window.matchMedia('(min-width: 1280px)').matches,
		is2Xl: window.matchMedia('(min-width: 1536px)').matches,
		is3Xl: window.matchMedia('(min-width: 1920px)').matches
	};

	return screens;
};

export type Screens = ReturnType<typeof defineScreen>;