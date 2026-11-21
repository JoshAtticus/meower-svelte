<!-- A group chat's icon -->
<script>
	export let chat;
	export let size = 1;

	import chatFallback from "../assets/chat.svg";
	import {uploadsUrl} from "./urls.js";

	let failed = false;
	$: src =
		chat && chat.icon && !failed
			? `${uploadsUrl}icons/${chat.icon}`
			: chatFallback;
	$: color =
		chat &&
		/^[0-9a-fA-F]{6}$/.test(chat.icon_color || "") &&
		chat.icon_color !== "000000"
			? `#${chat.icon_color}`
			: null;
</script>

<span
	class="chat-icon"
	style:--size={size}
	style:border-color={color}
>
	<img
		{src}
		alt="Chat icon"
		class:fallback={!(chat && chat.icon) || failed}
		draggable="false"
		on:error={() => (failed = true)}
	/>
</span>

<style>
	.chat-icon {
		width: calc(var(--size) * 2.75em);
		height: calc(var(--size) * 2.75em);
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		background-color: var(--pfp-bg);
		border: solid 1.5px var(--pfp-outline);
		border-bottom-width: 4px;
		border-radius: calc(var(--size) * 0.9em);

		overflow: hidden;
		user-select: none;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	img.fallback {
		width: 60%;
		height: 60%;
		object-fit: contain;
	}
</style>
