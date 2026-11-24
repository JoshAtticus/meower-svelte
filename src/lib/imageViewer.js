import {writable} from "svelte/store";

/**
 * The image viewer's state: null when closed, otherwise
 * {items: [{src, alt, downloadUrl}], index}.
 */
export const viewer = writable(null);

export function openViewer(items, index = 0) {
	if (!items || !items.length) return;
	viewer.set({items, index: Math.min(Math.max(index, 0), items.length - 1)});
}

export function closeViewer() {
	viewer.set(null);
}
