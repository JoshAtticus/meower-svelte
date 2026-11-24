// Touchscreens keep :hover applied to whatever was last tapped, so hover
// styles only apply on devices that can really hover (mouse, trackpad, pen).
const hoverOnly = () => ({
	postcssPlugin: "hover-only-on-hover-devices",
	Once(root, {AtRule}) {
		const inKeyframes = rule => {
			for (let p = rule.parent; p; p = p.parent) {
				if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
				if (
					p.type === "atrule" &&
					p.name === "media" &&
					/hover\s*:\s*hover/.test(p.params)
				)
					return true;
			}
			return false;
		};
		root.walkRules(rule => {
			if (!rule.selector.includes(":hover") || inKeyframes(rule)) return;
			const hover = rule.selectors.filter(s => s.includes(":hover"));
			const rest = rule.selectors.filter(s => !s.includes(":hover"));
			const media = new AtRule({name: "media", params: "(hover: hover)"});
			const copy = rule.clone();
			copy.selectors = hover;
			media.append(copy);
			if (rest.length) {
				rule.selectors = rest;
				rule.after(media);
			} else {
				rule.replaceWith(media);
			}
		});
	},
});
hoverOnly.postcss = true;

module.exports = {plugins: [hoverOnly]};
