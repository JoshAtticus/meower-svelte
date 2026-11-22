/**
 * Svelte action turning a contenteditable element into a textarea-like
 * composer that shows custom emojis (<:EMOJI_ID>) as images.
 *
 * The element gets textarea-style members so existing code keeps working:
 *   node.value      -> text with emojis serialized as <:id> (get/set)
 *   node.disabled   -> read-only state (get/set)
 *   node.insert(t)  -> insert text (which may contain <:id>) at the caret
 */
const EMOJI_RE = /<:([a-zA-Z0-9]{24})>/g;

export function richInput(node, {uploadsUrl, disabled = false, onFiles = null} = {}) {
	let lastRange = null;

	function emojiImg(id) {
		const img = document.createElement("img");
		img.className = "composer-emoji";
		img.src = `${uploadsUrl}emojis/${id}`;
		img.alt = "emoji";
		img.dataset.emoji = id;
		img.draggable = false;
		return img;
	}

	// Build DOM nodes for text that may contain <:id> and newlines
	function fragmentFor(text) {
		const frag = document.createDocumentFragment();
		let last = 0;
		const pushText = t => {
			t.split("\n").forEach((line, i) => {
				if (i > 0) frag.appendChild(document.createElement("br"));
				if (line) frag.appendChild(document.createTextNode(line));
			});
		};
		for (const m of text.matchAll(EMOJI_RE)) {
			pushText(text.slice(last, m.index));
			frag.appendChild(emojiImg(m[1]));
			last = m.index + m[0].length;
		}
		pushText(text.slice(last));
		return frag;
	}

	function serialize(el) {
		let out = "";
		el.childNodes.forEach((child, i) => {
			if (child.nodeType === Node.TEXT_NODE) {
				out += child.textContent;
			} else if (child.nodeName === "IMG" && child.dataset.emoji) {
				out += `<:${child.dataset.emoji}>`;
			} else if (child.nodeName === "BR") {
				out += "\n";
			} else if (child.nodeName === "DIV" || child.nodeName === "P") {
				// browsers wrap new lines in blocks when Enter is pressed
				out += (i > 0 ? "\n" : "") + serialize(child);
			} else {
				out += serialize(child);
			}
		});
		return out;
	}

	function placeCaretAtEnd() {
		const range = document.createRange();
		range.selectNodeContents(node);
		range.collapse(false);
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		lastRange = range.cloneRange();
	}

	function insert(text) {
		if (node.disabled) return;
		node.focus();
		const sel = window.getSelection();
		let range =
			sel.rangeCount && node.contains(sel.getRangeAt(0).commonAncestorContainer)
				? sel.getRangeAt(0)
				: lastRange && node.contains(lastRange.commonAncestorContainer)
				? lastRange
				: null;
		if (!range) {
			placeCaretAtEnd();
			range = sel.getRangeAt(0);
		}
		range.deleteContents();
		const frag = fragmentFor(text);
		const lastNode = frag.lastChild;
		range.insertNode(frag);
		if (lastNode) {
			range.setStartAfter(lastNode);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
			lastRange = range.cloneRange();
		}
		node.dispatchEvent(new Event("input", {bubbles: true}));
	}

	Object.defineProperty(node, "value", {
		configurable: true,
		get: () => serialize(node).replace(/\u00a0/g, " "),
		set: v => {
			node.replaceChildren(fragmentFor(String(v ?? "")));
			node.classList.toggle("empty", !node.childNodes.length);
		},
	});
	Object.defineProperty(node, "disabled", {
		configurable: true,
		get: () => node.getAttribute("contenteditable") !== "true",
		set: v => {
			node.setAttribute("contenteditable", v ? "false" : "true");
			node.setAttribute("aria-disabled", v ? "true" : "false");
			node.classList.toggle("disabled", !!v);
		},
	});
	node.insert = insert;
	node.caretToEnd = placeCaretAtEnd;
	node.disabled = disabled;
	node.classList.add("empty");

	const onInput = () => {
		// an editor left holding only a <br> should count as empty
		if (node.childNodes.length === 1 && node.firstChild.nodeName === "BR") {
			node.replaceChildren();
		}
		node.classList.toggle("empty", !node.childNodes.length);
	};
	const onPaste = e => {
		e.preventDefault();
		if (onFiles && e.clipboardData?.files?.length) {
			onFiles([...e.clipboardData.files]);
		}
		const text = e.clipboardData.getData("text/plain");
		if (text || !(onFiles && e.clipboardData?.files?.length)) {
			insert(text);
		}
	};
	const rememberRange = () => {
		const sel = window.getSelection();
		if (sel.rangeCount && node.contains(sel.getRangeAt(0).commonAncestorContainer)) {
			lastRange = sel.getRangeAt(0).cloneRange();
		}
	};
	node.addEventListener("input", onInput);
	node.addEventListener("paste", onPaste);
	node.addEventListener("keyup", rememberRange);
	node.addEventListener("mouseup", rememberRange);
	node.addEventListener("blur", rememberRange);

	return {
		update(opts) {
			uploadsUrl = opts.uploadsUrl;
			node.disabled = !!opts.disabled;
			if ("onFiles" in opts) onFiles = opts.onFiles;
		},
		destroy() {
			node.removeEventListener("input", onInput);
			node.removeEventListener("paste", onPaste);
			node.removeEventListener("keyup", rememberRange);
			node.removeEventListener("mouseup", rememberRange);
			node.removeEventListener("blur", rememberRange);
		},
	};
}
