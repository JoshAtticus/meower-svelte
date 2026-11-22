<!-- Mobile bottom tab bar for the new layout -->
<script>
	import PFP from "../PFP.svelte";

	import SignupModal from "../modals/Signup.svelte";
	import LogoutModal from "../modals/Logout.svelte";

	import {user, friends, chats} from "../stores.js";
	import {chatReads, isChatUnread} from "../unread.js";
	import {swipeDismiss} from "../swipeDismiss.js";
	import * as modals from "../modals.js";

	import home from "../../assets/home.svg";
	import mail from "../../assets/mail.svg";
	import friendsIcon from "../../assets/friends.svg";
	import gc from "../../assets/chat.svg";
	import profile from "../../assets/profile.svg";
	import settings from "../../assets/settings.svg";
	import logout from "../../assets/logout.svg";
	import info from "../../assets/info.svg";

	import {goto, isActive} from "@roxi/routify";

	let menuOpen = false;

	$: tabs = [
		{label: "Home", icon: home, href: "/home", active: $isActive("./home")},
		{
			label: "Chats",
			icon: gc,
			href: "/chats",
			active: $isActive("./chats", {}, {strict: false}),
			badge: $chats.some(c => isChatUnread(c, $chatReads)),
		},
		{
			label: "Inbox",
			icon: mail,
			href: "/inbox",
			active: $isActive("./inbox"),
			badge: $user.unread_inbox,
		},
		{
			label: "Friends",
			icon: friendsIcon,
			href: "/friends",
			active: $isActive("./friends"),
			badge: $friends.incoming.length > 0,
		},
	];
</script>

<svelte:body on:click={() => (menuOpen = false)} />

<nav class="tabbar" aria-label="Main navigation">
	{#each tabs as tab}
		<button
			class="tab"
			class:active={tab.active}
			on:click={() => {
				if (!$user.name) {
					modals.showModal(SignupModal);
					return;
				}
				$goto(tab.href);
			}}
			aria-label={tab.label}
			aria-current={tab.active ? "page" : undefined}
		>
			<span class="micon" style:--icon={`url(${tab.icon})`} />
			<span class="tab-label">{tab.label}</span>
			{#if tab.badge}
				<span class="tab-badge" aria-label="Unread" />
			{/if}
		</button>
	{/each}
	<button
		class="tab profile-tab"
		class:active={$isActive("./users/:user", {user: $user.name}) ||
			$isActive("./settings") ||
			$isActive("./about")}
		on:click|stopPropagation={() => (menuOpen = !menuOpen)}
		aria-label="Profile menu"
	>
		<span class="mpfp tab-avatar">
			<PFP
				raw={true}
				size={0.42}
				alt=""
				icon={$user.name ? $user.pfp_data : -3}
				avatar={$user.name ? $user.avatar : ""}
				avatarColor={$user.avatar_color}
			/>
		</span>
		<span class="tab-label">You</span>
	</button>
</nav>

{#if menuOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="sheet-overlay" on:click={() => (menuOpen = false)} />
	<div
		class="profile-sheet"
		use:swipeDismiss={{enabled: true, onDismiss: () => (menuOpen = false)}}
		on:click|stopPropagation
	>
		<div class="sheet-handle" />
		<button
			class="sheet-item"
			on:click={() => {
				if (!$user.name) {
					modals.showModal(SignupModal);
					return;
				}
				$goto(`/users/${$user.name}`);
				menuOpen = false;
			}}
		>
			<span class="micon" style:--icon={`url(${profile})`} /> Profile
		</button>
		<button
			class="sheet-item"
			on:click={() => {
				$goto("/settings");
				menuOpen = false;
			}}
		>
			<span class="micon" style:--icon={`url(${settings})`} /> Settings
		</button>
		<button
			class="sheet-item"
			on:click={() => {
				$goto("/about");
				menuOpen = false;
			}}
		>
			<span class="micon" style:--icon={`url(${info})`} /> About
		</button>
		<button
			class="sheet-item"
			on:click={() => {
				menuOpen = false;
				modals.showModal(LogoutModal);
			}}
		>
			<span class="micon" style:--icon={`url(${logout})`} /> Log out
		</button>
	</div>
{/if}

<style>
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 90;
		display: flex;
		align-items: center;
		justify-content: space-around;
		height: calc(64px + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		box-sizing: border-box;
		background-color: color-mix(
			in srgb,
			var(--surface) 88%,
			transparent
		);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-top: solid 1px var(--hairline);
		user-select: none;
	}
	.tab {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15em;
		width: 3.6em;
		height: 3.2em;
		padding: 0;
		border: none;
		border-radius: 12px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		cursor: pointer;
		line-height: 0;
	}
	.micon {
		display: inline-block;
		width: 24px;
		height: 24px;
		background-color: currentColor;
		-webkit-mask-image: var(--icon);
		mask-image: var(--icon);
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
		flex-shrink: 0;
	}
	.tab img {
		width: 24px;
		height: 24px;
		object-fit: contain;
	}
	/* "You" avatar: same 24px box as the icons (PFP = --size * 3.75em) */
	.tab-avatar {
		font-size: 0.75em;
	}
	.tab-label {
		font-size: 0.58em;
		line-height: 1;
	}
	.tab.active {
		color: var(--orange);
	}
	.tab-badge {
		position: absolute;
		top: 0.5em;
		right: 0.7em;
		width: 0.6em;
		height: 0.6em;
		border-radius: 50%;
		background: crimson;
	}
	.sheet-overlay {
		position: fixed;
		inset: 0;
		z-index: 95;
		background: rgba(0, 0, 0, 0.4);
		animation: sheet-fade 0.2s ease;
	}
	@keyframes sheet-fade {
		from {
			opacity: 0;
		}
	}
	.profile-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 96;
		display: flex;
		flex-direction: column;
		gap: 0.2em;
		padding: 0.6em 0.8em;
		padding-bottom: calc(0.8em + env(safe-area-inset-bottom));
		background-color: var(--surface);
		border-top: solid 1px var(--hairline);
		border-radius: var(--m-radius) var(--m-radius) 0 0;
		animation: sheet-up 0.25s ease;
	}
	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
	}
	.sheet-handle {
		width: 2.5em;
		height: 0.3em;
		border-radius: 1em;
		background-color: var(--orange);
		opacity: 0.6;
		margin: 0 auto 0.5em;
	}
	.sheet-item {
		display: flex;
		align-items: center;
		gap: 0.7em;
		padding: 0.7em 0.6em;
		border: none;
		border-radius: 12px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		font-size: 1em;
		cursor: pointer;
		text-align: left;
	}
	.sheet-item:hover,
	.sheet-item:active {
		background-color: var(--surface-2);
	}
	.sheet-item img {
		width: 1.4em;
		height: 1.4em;
	}
</style>
