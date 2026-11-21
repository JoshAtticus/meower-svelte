/**
 * Svelte action that moves an element to the end of #main while `enabled` is true, so
 * fixed-position sheets can't be trapped by a transformed or clipping ancestor.
 * Usage: <div use:portal={$mobile}>
 */
export function portal(node, enabled = true) {
	const placeholder = document.createComment("portal");
	let moved = false;

	function apply(on) {
		if (on && !moved) {
			node.parentNode.insertBefore(placeholder, node);
			// #main carries the theme variables and mode classes
			(document.getElementById("main") || document.body).appendChild(node);
			moved = true;
		} else if (!on && moved) {
			placeholder.parentNode?.insertBefore(node, placeholder);
			placeholder.remove();
			moved = false;
		}
	}

	apply(enabled);
	return {
		update: apply,
		destroy() {
			if (moved) {
				node.remove();
				placeholder.remove();
			}
		},
	};
}
