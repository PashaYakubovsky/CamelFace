import { goto } from '$app/navigation';
import { gsap } from 'gsap/all';
import { writable } from 'svelte/store';

export const pageTransition = writable<{ start: boolean; toPage: string; backgroundColor: string }>(
	{
		start: false,
		toPage: '',
		backgroundColor: '#fff'
	}
);

export const transitionIn = ({ toPage }: { toPage: string }): gsap.core.Tween | null => {
	const transitionElement = document.querySelector('#transition') as HTMLDivElement;
	const isMobile = window.matchMedia('(max-width: 768px)').matches;

	if (!isMobile) {
		const tween = gsap.to(transitionElement, {
			opacity: 1,
			xPercent: 0,
			duration: 0.8,
			ease: 'power0',
			filter: 'blur(0px)',
			onComplete: () => {
				goto(toPage);
			}
		});

		return tween;
	} else {
		goto(toPage);
	}

	return null;
};

export const transitionOut = (): gsap.core.Tween => {
	const transitionElement = document.querySelector('#transition') as HTMLDivElement;

	const tween = gsap.to(transitionElement, {
		filter: 'blur(3px)',
		duration: 0.3,
		xPercent: -100,
		onComplete: () => {
			pageTransition.update((v) => ({ ...v, start: false }));
		}
	});

	return tween;
};

export const handleHoverIn = ({ start, color }: { start: boolean; color: string }) => {
	const transitionElement = document.querySelector('#transition') as HTMLDivElement;
	const postTitleElem = document.querySelectorAll('#postTitle') as unknown as HTMLTitleElement[];

	if (transitionElement && !start) {
		gsap.to(transitionElement, {
			xPercent: -98.5,
			borderRadius: '0.5rem',
			duration: 0.3,
			backgroundColor: color,
			ease: 'power0'
		});
	}
	// trigger hover effect on post title
	if (postTitleElem) {
		postTitleElem.forEach((title) => {
			title.classList.add('hover');
			title.classList.remove('hover-out');
		});
	}
};

export const handleHoverOut = ({ start }: { start: boolean }) => {
	const transitionElement = document.querySelector('#transition') as HTMLDivElement;
	const postTitleElem = document.querySelectorAll('#postTitle') as unknown as HTMLTitleElement[];

	if (transitionElement && !start) {
		gsap.to(transitionElement, {
			xPercent: -99.5,
			borderRadius: '0rem',
			duration: 0.3,
			ease: 'power0'
		});
	}
	// trigger hover effect on post title
	if (postTitleElem) {
		postTitleElem.forEach((title) => {
			title.classList.remove('hover');
			title.classList.add('hover-out');
		});
	}
};
