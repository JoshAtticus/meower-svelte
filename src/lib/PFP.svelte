<!-- To nobody's surprise, a profile picture! -->
<script>
	export let icon = -1;
	export let avatar = "";
	export let avatarColor = "";
	export let alt = "Profile picture";
	export let online = false;
	export let size = 1;
	export let raw = false;

	import errorIcon from "../assets/avatars/icon_err.svg";
	import {uploadsUrl} from "./urls.js";

	/**
	 * @type {*}
	 */
	const icons = import.meta.glob("../assets/avatars/*.svg", {
		import: "default",
		eager: true,
	});

	// only respond to `icon` changing
	let id;
	function setId(val) {
		id = val;
	}
	$: setId(icon);
</script>

<span class:pfp-container={!raw} style:--size={size}>
	{#if online && !raw}
		<span class="online" />
	{/if}
	<span
		class:pfp={!raw}
		class:raw-pfp={raw}
		class:custom-avatar={!!avatar}
		style:border-color={avatarColor && avatarColor !== "000000"
			? `#${avatarColor}`
			: null}
	>
		<img
			{alt}
			title={alt}
			src={avatar
				? `${uploadsUrl}icons/${avatar}`
				: icons[
				`../assets/avatars/icon_${
					id === -1
						? 21
						: id === -2
						? "err"
						: id === -3
						? "guest"
						: id - 1
				}.svg`
			] || errorIcon}
			on:error={() => {
				if (avatar) {
					avatar = "";
				} else {
					id = -2;
				}
			}}
			class:loading={icon === -1}
			draggable={false}
			width="auto"
			height="100%"
		/>
	</span>
</span>

<style>
	.pfp-container {
		display: inline-block;
		position: relative;
	}
	.raw-pfp {
		width: calc(var(--size) * 3.75em);
		height: calc(var(--size) * 3.75em);
	}
	.pfp {
		width: calc(var(--size) * 3.75em);
		height: calc(var(--size) * 3.75em);
		box-sizing: border-box;

		background-color: var(--pfp-bg);
		border: solid 1.5px var(--pfp-outline);
		border-bottom-width: 5px;
		border-radius: calc(var(--size) * 1.25em);

		display: flex;
		align-items: center;
		justify-content: center;
		user-select: none;

		/* Always make fallback text visible */
		color: black;
	}

	.custom-avatar {
		padding: 0;
	}
	.pfp.custom-avatar,
	.raw-pfp.custom-avatar {
		overflow: hidden;
	}
	.custom-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.loading {
		animation: spin 0.5s linear infinite;
		filter: saturate(0) brightness(1.5);
	}
	@keyframes spin {
		from {
			transform: rotate(0turn);
		}
		to {
			transform: rotate(1turn);
		}
	}

	.online {
		display: inline-block;

		width: calc(var(--size) * 1em);
		height: calc(var(--size) * 1em);
		border-radius: 100%;

		background-color: limegreen;

		position: absolute;
		bottom: calc(var(--size) * -0.2em);
		right: calc(var(--size) * -0.2em);
		z-index: 1;
	}
</style>
