<!-- Desktop navigation rail for the new layout -->
<script>
	import PFP from "../PFP.svelte";

	import SignupModal from "../modals/Signup.svelte";
	import ModPanelModal from "../modals/moderation/ModPanel.svelte";
	import LogoutModal from "../modals/Logout.svelte";

	import {user, friends, chats, OOBERunning} from "../stores.js";
	import {chatReads, isChatUnread} from "../unread.js";
	import * as modals from "../modals.js";

	import logo from "../../assets/logo.svg";
	import home from "../../assets/home.svg";
	import mail from "../../assets/mail.svg";
	import friendsIcon from "../../assets/friends.svg";
	import gc from "../../assets/chat.svg";
	import search from "../../assets/search.svg";
	import shield from "../../assets/shield.svg";
	import profile from "../../assets/profile.svg";
	import settings from "../../assets/settings.svg";
	import logout from "../../assets/logout.svg";
	import info from "../../assets/info.svg";

	import {goto, isActive} from "@roxi/routify";

	let menuOpen = false;

	$: items = [
		{label: "Home", icon: home, href: "/home", active: $isActive("./home")},
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
		{
			label: "Chats",
			icon: gc,
			href: "/chats",
			active: $isActive("./chats", {}, {strict: false}),
			badge: $chats.some(c => isChatUnread(c, $chatReads)),
		},
		{label: "Search", icon: search, href: "/search", active: $isActive("./search")},
	];
</script>

<svelte:body on:click={() => (menuOpen = false)} />

<nav class="navrail" aria-label="Main navigation">
	{#if $OOBERunning}
		<div class="locked" />
	{/if}
	<button
		class="brand"
		on:click={() => $goto("/home")}
		aria-label="Meower home"
	>
		<span
			class="brand-mark"
			style:--logo={`url(${logo})`}
			role="img"
			aria-label="Meower"
		/>
	</button>

	<div class="nav-items">
		{#each items as item}
			<button
				class="nav-item"
				class:active={item.active}
				on:click={() => {
					if (!$user.name && item.href !== "/search") {
						modals.showModal(SignupModal);
						return;
					}
					$goto(item.href);
				}}
				aria-current={item.active ? "page" : undefined}
			>
				<span class="micon" style:--icon={`url(${item.icon})`} />
				<span class="nav-label">{item.label}</span>
				{#if item.badge}
					<span class="nav-badge" aria-label="Unread" />
				{/if}
			</button>
		{/each}
		{#if $user.permissions}
			<button
				class="nav-item"
				on:click={() => modals.showModal(ModPanelModal)}
			>
				<span class="micon" style:--icon={`url(${shield})`} />
				<span class="nav-label">Moderation</span>
			</button>
		{/if}
	</div>

	<div class="rail-bottom">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div on:click|stopPropagation>
			{#if menuOpen}
				<div class="rail-menu">
					<button
						class="nav-item"
						on:click={() => {
							if (!$user.name) {
								modals.showModal(SignupModal);
								return;
							}
							$goto(`/users/${$user.name}`);
							menuOpen = false;
						}}
					>
						<span class="micon" style:--icon={`url(${profile})`} />
						<span class="nav-label">Profile</span>
					</button>
					<button
						class="nav-item"
						on:click={() => {
							$goto("/settings");
							menuOpen = false;
						}}
					>
						<span class="micon" style:--icon={`url(${settings})`} />
						<span class="nav-label">Settings</span>
					</button>
					<button
						class="nav-item"
						on:click={() => {
							$goto("/about");
							menuOpen = false;
						}}
					>
						<span class="micon" style:--icon={`url(${info})`} />
						<span class="nav-label">About</span>
					</button>
					<button
						class="nav-item"
						on:click={() => {
							menuOpen = false;
							modals.showModal(LogoutModal);
						}}
					>
						<span class="micon" style:--icon={`url(${logout})`} />
						<span class="nav-label">Log out</span>
					</button>
				</div>
			{/if}
			<div class="profile-card">
				<button
					class="profile-btn"
					on:click={() => (menuOpen = !menuOpen)}
					title="Account menu"
					aria-label="Account menu"
				>
					<span class="mpfp">
						<PFP
							raw={true}
							size={0.55}
							alt=""
							icon={$user.name ? $user.pfp_data : -3}
							avatar={$user.name ? $user.avatar : ""}
							avatarColor={$user.avatar_color}
						/>
					</span>
					<span class="nav-label profile-name"
						>{$user.name || "Guest"}</span
					>
				</button>
				<button
					class="gear"
					on:click={() => $goto("/settings")}
					title="Settings"
					aria-label="Settings"
				>
					<span class="micon" style:--icon={`url(${settings})`} />
				</button>
			</div>
		</div>
	</div>
</nav>

<style>
	.navrail {
		position: relative;
		width: 232px;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 0.8em 0.6em;
		gap: 0.4em;
		background-color: var(--surface);
		border-right: solid 1px var(--hairline);
		user-select: none;
	}
	.locked {
		position: absolute;
		inset: 0;
		z-index: 10;
		background-color: #000;
		opacity: 0.33;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.55em;
		padding: 0.4em 0.5em;
		background: none;
		border: none;
		margin-bottom: 0.4em;
	}
	/* wordmark follows the theme accent via a mask */
	.brand-mark {
		display: inline-block;
		height: 1.5em;
		width: 5.4em;
		background-color: var(--orange);
		-webkit-mask-image: var(--logo);
		mask-image: var(--logo);
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: left center;
		mask-position: left center;
	}
	.nav-items {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
		flex-grow: 1;
	}
	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.65em;
		padding: 0.5em 0.7em;
		border: none;
		border-radius: 999px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		font-size: 1em;
		text-align: left;
		cursor: pointer;
		line-height: 0;
	}
	.micon {
		display: inline-block;
		width: 1.4em;
		height: 1.4em;
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
	.nav-item img {
		width: 1.4em;
		height: 1.4em;
		object-fit: contain;
	}
	.nav-item:hover {
		background-color: var(--surface-2);
	}
	.nav-item.active {
		background-color: var(--orange);
		color: var(--foreground-orange);
	}
	.nav-label {
		line-height: 1.2;
	}
	.nav-badge {
		width: 0.55em;
		height: 0.55em;
		border-radius: 50%;
		background: crimson;
		margin-left: auto;
		flex-shrink: 0;
	}
	.nav-item.active .nav-badge {
		box-shadow: 0 0 0 2px var(--orange);
	}
	.rail-bottom {
		position: relative;
	}
	.rail-menu {
		position: absolute;
		bottom: calc(100% + 0.4em);
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1em;
		padding: 0.4em;
		background-color: var(--surface);
		border: solid 1px var(--hairline);
		border-radius: var(--m-radius);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
		z-index: 20;
	}
	.profile-card {
		display: flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.3em;
		border-radius: 999px;
		background-color: var(--surface-2);
	}
	.profile-btn {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.25em 0.4em;
		border: none;
		border-radius: 999px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		font-size: 0.95em;
		cursor: pointer;
		text-align: left;
	}
	.profile-btn:hover {
		background-color: var(--surface);
	}
	.profile-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.gear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2em;
		height: 2em;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: none;
		color: var(--foreground);
		cursor: pointer;
		flex-shrink: 0;
	}
	.gear:hover {
		background-color: var(--surface);
	}
	.gear:hover .micon {
		background-color: var(--orange);
	}
	.gear .micon {
		width: 1.1em;
		height: 1.1em;
	}

	/* collapsed icon rail between 900-1100px */
	@media (max-width: 1100px) and (min-width: 900px) {
		.navrail {
			width: 72px;
			align-items: center;
			padding: 0.8em 0.4em;
		}
		.brand-mark {
			height: 1.4em;
			width: 2.8em;
			-webkit-mask-size: auto 100%;
			mask-size: auto 100%;
		}
		.nav-label,
		.profile-name {
			display: none;
		}
		.nav-item {
			justify-content: center;
			padding: 0.6em;
			width: 2.8em;
		}
		.nav-badge {
			position: absolute;
			top: 0.3em;
			right: 0.3em;
			margin: 0;
		}
		.profile-card {
			padding: 0.25em;
			background: none;
		}
		.gear {
			display: none;
		}
		.rail-menu {
			left: auto;
			right: auto;
			width: 11em;
		}
		.rail-menu .nav-label {
			display: inline;
		}
		.rail-menu .nav-item {
			width: auto;
			justify-content: flex-start;
		}
	}
</style>
