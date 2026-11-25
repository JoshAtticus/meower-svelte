<!-- Meower Svelte, the app itself. -->
<script>
	import EmailBanner from "../lib/EmailBanner.svelte";
	import Setup from "../lib/Setup.svelte";
	import OOBE from "../lib/OOBE/Main.svelte";
	import Sidebar from "../lib/Sidebar.svelte";
	import NavRail from "../lib/modern/NavRail.svelte";
	import TabBar from "../lib/modern/TabBar.svelte";
	import ChatsPanel from "../lib/modern/ChatsPanel.svelte";
	import Spinner from "../lib/Spinner.svelte";
	import UpdateNotice from "../lib/UpdateNotice.svelte";
	import ImageViewer from "../lib/ImageViewer.svelte";

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
	import {mobile, touch, systemDark} from "../lib/responsiveness.js";
	import {localLayout} from "../lib/layoutPref.js";
	import {modernLayout} from "../lib/modernLayout.js";
	import {themeColors, validProfileColor} from "../lib/themes.js";
	import {pageAccent} from "../lib/pageAccent.js";
	import * as BGM from "../lib/BGM.js";
	import {retryReconnectNow} from "../lib/clmanager.js";

	import {afterPageLoad, params, page} from "@roxi/routify";
	import {tick} from "svelte";

	// colours for the built-in themes (custom themes set their own)
	// a page accent (e.g. the profile being viewed) overrides the theme
	$: isDark = $user.mode == null ? $systemDark : $user.mode === false;
	$: accentOn = validProfileColor($pageAccent);
	$: tc = accentOn
		? themeColors("profile", isDark, $pageAccent)
		: themeColors($user.theme, isDark, $user.avatar_color);
	$: custom = $useCustomTheme && !accentOn;

	// keep the browser/PWA chrome (status bar, address bar) matching the app, not orange
	$: themeColor =
		(custom ? $customTheme.background : tc?.background) ||
		(isDark ? "#202020" : "#ffffff");
	$: if (typeof document !== "undefined") {
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "theme-color";
			document.head.appendChild(meta);
		}
		meta.setAttribute("content", themeColor);
	}

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
	style:--orange={custom ? $customTheme.orange : tc?.main}
	style:--orange-button={custom ? $customTheme.orange : tc?.main}
	style:--orange-light={custom ? $customTheme.orangeLight : tc?.light}
	style:--orange-dark={custom ? $customTheme.orangeDark : tc?.dark}
	style:--orange-scrollbar-back={custom ? null : tc?.scroll}
	style:--background={custom ? $customTheme.background : tc?.background}
	style:--foreground={custom ? $customTheme.foreground : tc?.foreground}
	style:--foreground-orange={custom
		? $customTheme.foregroundOrange
		: tc?.foregroundOrange}
	class:mode-light={!isDark}
	class:mode-dark={isDark}
	class:layout-modern={$modernLayout}
	class:layout-old={!$modernLayout && ($localLayout || $user.layout) === "old"}
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
				{#if $modernLayout}
					{#if !$mobile}
						<NavRail />
					{/if}
				{:else}
					<Sidebar />
				{/if}
			</div>
			{#if $OOBERunning}
				<div class="viewnopad">
					<OOBE />
				</div>
			{:else if !remounting}
				<div class="view">
					<EmailBanner />
					<slot />
				</div>
				{#if $modernLayout && !$mobile && !$params.chatid}
					<div class="modern-rail">
						<ChatsPanel />
					</div>
				{/if}
				{#if $modernLayout && $mobile}
					<TabBar />
				{/if}
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
	<UpdateNotice />
	<ImageViewer />
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
		/* the visible area only, so nothing hides behind mobile browser bars */
		height: 100dvh;
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
		--view-height: calc(100dvh - 0.66em);

		background-color: var(--background);
		transition: 0.25s;
	}

	.viewnopad {
		flex-grow: 1;
		flex-shrink: 1;

		box-sizing: border-box;
		overflow: auto;

		--view-height: calc(100vh - 0.66em);
		--view-height: calc(100dvh - 0.66em);

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
		--view-height: calc(100dvh - 3.5em - 0.66em);
	}

	/* new layout: right panel only on wide screens */
	.modern-rail {
		display: none;
		flex-shrink: 0;
		padding: 0.8em 0.8em 0.8em 12px;
		box-sizing: border-box;
	}
	@media (min-width: 1200px) {
		:global(main.layout-modern) .modern-rail {
			display: block;
		}
	}
</style>
