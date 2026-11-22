<!-- Meower Svelte, the app itself. -->
<script>
	import Setup from "../lib/Setup.svelte";
	import OOBE from "../lib/OOBE/Main.svelte";
	import Sidebar from "../lib/Sidebar.svelte";
	import Spinner from "../lib/Spinner.svelte";

	import {
		screen,
		modalStack,
		reconnecting,
		reconnectStalled,
		OOBERunning,
		user,
		spinner,
		useCustomTheme,
		customTheme,
	} from "../lib/stores.js";
	import {mobile, touch} from "../lib/responsiveness.js";
	import {localLayout} from "../lib/layoutPref.js";
	import * as BGM from "../lib/BGM.js";
	import {retryReconnectNow} from "../lib/clmanager.js";

	import {afterPageLoad, params} from "@roxi/routify";
	import {tick} from "svelte";

	// the Profile theme: your profile colour on top of the orange theme
	$: profileColor =
		$user.theme === "profile" &&
		/^[0-9a-fA-F]{6}$/.test($user.avatar_color || "") &&
		$user.avatar_color !== "000000"
			? `#${$user.avatar_color}`
			: null;
	$: profileColorLight = profileColor
		? `color-mix(in srgb, ${profileColor} 60%, white)`
		: null;
	$: profileColorDark = profileColor
		? `color-mix(in srgb, ${profileColor} 70%, black)`
		: null;

	let currentPage = "";
	let currentParams = JSON.stringify($params);
	let remounting = false;
	$afterPageLoad(async page => {
		if (remounting) return;

		if (page.title === currentPage) {
			if (currentParams !== JSON.stringify($params)) {
				currentPage = page.title;
				currentParams = JSON.stringify($params);

				remounting = true;
				await tick();
				remounting = false;
			}
		} else {
			currentPage = page.title;
			currentParams = JSON.stringify($params);
		}
	});
</script>

<!-- routify:options bundle=true -->

<main
	id="main"
	style:--orange={$useCustomTheme ? $customTheme.orange : profileColor}
	style:--orange-button={$useCustomTheme ? $customTheme.orange : profileColor}
	style:--orange-light={$useCustomTheme
		? $customTheme.orangeLight
		: profileColorLight}
	style:--orange-dark={$useCustomTheme
		? $customTheme.orangeDark
		: profileColorDark}
	style:--background={$useCustomTheme ? $customTheme.background : null}
	style:--foreground={$useCustomTheme ? $customTheme.foreground : null}
	style:--foreground-orange={$useCustomTheme
		? $customTheme.foregroundOrange
		: null}
	class:theme-orange={$user.theme === "orange" || $user.theme === "profile"}
	class:theme-blue={$user.theme === "blue"}
	class:mode-light={!($user.mode === false)}
	class:mode-dark={$user.mode === false}
	class:layout-old={($localLayout || $user.layout) === "old"}
	class:layout-mobile={$mobile}
	class:input-touch={$touch}
	class:input-hover={!$touch}
	on:mousedown={() => BGM.canPlayNow()}
	on:keydown={() => BGM.canPlayNow()}
>
	{#if $modalStack.length > 0}
		<svelte:component
			this={$modalStack[0].modal}
			modalData={$modalStack[0].data}
		/>
	{/if}

	{#if $screen === "blank"}
		<div id="blank" />
	{:else if $screen === "setup"}
		<Setup />
	{:else}
		<div class="main-screen">
			<div class="transition" />
			<div class="sidebar">
				<Sidebar />
			</div>
			{#if $OOBERunning}
				<div class="viewnopad">
					<OOBE />
				</div>
			{:else if !remounting}
				<div class="view">
					<slot />
				</div>
			{/if}
		</div>
	{/if}

	{#if $spinner && !$reconnecting}
		<div class="spinner-container">
			<Spinner />
		</div>
	{/if}

	{#if $reconnecting}
		{#if $reconnectStalled}
			<div class="reconnect-overlay">
				<div class="reconnect-card">
					<Spinner />
					<h2>Can't reach Meower</h2>
					<p>Still trying to reconnect...</p>
					<button on:click={retryReconnectNow}>Try now</button>
				</div>
			</div>
		{:else}
			<div class="reconnect-pill" role="status">
				<span class="reconnect-dot" />
				Reconnecting...
			</div>
		{/if}
	{/if}
</main>

<style>
	.reconnect-pill {
		position: fixed;
		left: 50%;
		bottom: 1.25em;
		transform: translateX(-50%);
		z-index: 10000;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.4em 0.9em;
		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 5px;
		box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.35);
		font-size: 0.9em;
		pointer-events: none;
	}
	.reconnect-dot {
		width: 0.6em;
		height: 0.6em;
		border-radius: 50%;
		background-color: var(--orange);
		animation: reconnect-pulse 1s ease-in-out infinite alternate;
	}
	@keyframes reconnect-pulse {
		from {
			opacity: 0.3;
		}
		to {
			opacity: 1;
		}
	}
	.reconnect-overlay {
		position: fixed;
		inset: 0;
		z-index: 10001;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
	}
	.reconnect-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6em;
		padding: 1.5em 2em;
		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 5px;
		text-align: center;
	}
	.reconnect-card h2,
	.reconnect-card p {
		margin: 0;
	}

	.spinner-container {
		position: fixed;
		right: 27px;
		bottom: 25px;
		z-index: 10000;
	}

	#main {
		width: 100%;
		height: 100%;

		font-family: Simvoni, sans-serif;

		--orange: #f9a636;
		--orange-button: var(--orange);
		--orange-light: #ffce8c;
		--orange-dark: #b46d34;
		--orange-scrollbar-back: #a15d04;
		--background: white;
		--foreground: black;
		--foreground-orange: white;

		--pfp-bg: white;
		--pfp-outline: #d9d9d9;

		background-color: var(--background);
		color: var(--foreground);
		scrollbar-color: var(--orange) var(--orange-scrollbar-back);
		font-size: 15pt;
	}

	#main.theme-orange.mode-dark {
		--orange: #e48b26;
		--orange-light: #f9a535;
		--orange-dark: #ac5b18;
		--orange-scrollbar-back: rgb(131, 45, 5);
		--background: #181818;
		--foreground: #eef;
		--foreground-orange: #eef;
	}
	#main.theme-blue {
		/*--orange: #aa0000;
		--orange-light: #aa0000;
		--orange-dark: #aa0000;
		--orange-scrollbar-back: #aa0000;*/
		--orange: #4d97ff;
		--orange-light: rgb(140, 189, 245);
		--orange-dark: #3888f1;
		--orange-scrollbar-back: color-mix(
			in srgb,
			#000000 20%,
			var(--orange-dark)
		);
		--background: white;
		--foreground: black;
		--foreground-orange: white;
		scrollbar-color: unset;
	}
	#main.theme-blue.mode-dark {
		--background: #181818;
		--foreground: white;
		--foreground-orange: white;
	}

	.main-screen {
		box-sizing: border-box;

		display: flex;
		flex-direction: row;
		gap: 0;

		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	.transition {
		background-color: var(--orange);
		height: 100%;
		width: 100%;
		position: absolute;
		animation-fill-mode: forwards;
		animation-timing-function: ease;
		z-index: 2;
	}

	:global(main:not(layout-old)) .transition {
		animation-name: transition;
		animation-duration: 0.7s;
	}

	:global(main.layout-old) .transition {
		animation-name: transitionOld;
		animation-duration: 0.6s;
	}

	@keyframes transition {
		from {
			width: 100%;
		}
		to {
			width: 3.5em;
		}
	}

	@keyframes transitionOld {
		from {
			height: 100%;
		}
		to {
			height: 3.5em;
		}
	}

	.sidebar {
		width: 3.5em;
		height: auto;

		z-index: 100;
		position: relative;

		flex-shrink: 0;
		flex-grow: 0;
		z-index: 3;
	}

	.view {
		flex-grow: 1;
		flex-shrink: 1;

		padding: 0.33em;
		box-sizing: border-box;
		overflow: auto;

		--view-height: calc(100vh - 0.66em);

		background-color: var(--background);
		transition: 0.25s;
	}

	.viewnopad {
		flex-grow: 1;
		flex-shrink: 1;

		box-sizing: border-box;
		overflow: auto;

		--view-height: calc(100vh - 0.66em);

		background-color: var(--background);
		transition: 0.25s;
	}

	.banner {
		background-color: crimson;
		margin: 0;
		padding: 0.5em;
		text-align: center;
	}

	/* bottom layout: the bar sits below the page */
	:global(main.layout-old) .main-screen {
		flex-direction: column-reverse;
	}
	:global(main.layout-old) .transition {
		top: auto;
		bottom: 0;
	}
	:global(main.layout-old) .sidebar {
		width: auto;
		height: 3.5em;
	}
	:global(main.layout-old) .view {
		--view-height: calc(100vh - 3.5em - 0.66em);
	}
</style>
