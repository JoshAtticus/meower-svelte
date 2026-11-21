/**
 * Svelte action: drag a bottom sheet down to dismiss it.
 * Usage: <div use:swipeDismiss={{enabled: $mobile, onDismiss: close}}>
 * Drags only start when the sheet isn't scrolled, so its content can scroll.
 */
export function swipeDismiss(node, options) {
	let opts = options || {};
	let startY = null;
	let dy = 0;

	function start(e) {
		if (!opts.enabled || node.scrollTop > 0) return;
		startY = e.touches[0].clientY;
		dy = 0;
	}
	function move(e) {
		if (startY === null) return;
		dy = Math.max(0, e.touches[0].clientY - startY);
		node.style.transition = "none";
		node.style.transform = `translateY(${dy}px)`;
	}
	function end() {
		if (startY === null) return;
		startY = null;
		node.style.transition = "";
		node.style.transform = "";
		if (dy > 100) opts.onDismiss && opts.onDismiss();
		dy = 0;
	}

	node.addEventListener("touchstart", start, {passive: true});
	node.addEventListener("touchmove", move, {passive: true});
	node.addEventListener("touchend", end);
	node.addEventListener("touchcancel", end);
	return {
		update(next) {
			opts = next || {};
		},
		destroy() {
			node.removeEventListener("touchstart", start);
			node.removeEventListener("touchmove", move);
			node.removeEventListener("touchend", end);
			node.removeEventListener("touchcancel", end);
		},
	};
}
