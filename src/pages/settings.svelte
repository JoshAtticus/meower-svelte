<!-- You probably know what this is. -->
<script>
	import {goto} from "@roxi/routify";
	import EmailModal from "../lib/modals/settings/Email.svelte";
	import {systemDark} from "../lib/responsiveness.js";
	import Container from "../lib/Container.svelte";
	import FormattedDate from "../lib/FormattedDate.svelte";

	import BasicModal from "../lib/modals/Basic.svelte";
	import SwitchThemeModal from "../lib/modals/settings/SwitchTheme.svelte";
	import SwitchBGMSFXModal from "../lib/modals/settings/SwitchBGMSFX.svelte";
	import ChangePasswordModal from "../lib/modals/settings/ChangePassword.svelte";
	import ChangeUsernameModal from "../lib/modals/settings/ChangeUsername.svelte";
	import LogoutEverywhereModal from "../lib/modals/settings/LogoutEverywhere.svelte";
	import TwoFactorSettingsModal from "../lib/modals/settings/TwoFactorSettings.svelte";
	import MyReportsModal from "../lib/modals/settings/MyReports.svelte";
	import DeleteAccountModal from "../lib/modals/settings/DeleteAccount.svelte";
	import NewLayoutTourModal from "../lib/modals/settings/NewLayoutTour.svelte";

	import {user, authHeader} from "../lib/stores.js";
	import {localLayout} from "../lib/layoutPref.js";
	import {modernLayout} from "../lib/modernLayout.js";
	import {apiUrl} from "../lib/urls.js";
	import * as clm from "../lib/clmanager.js";
	import * as modals from "../lib/modals.js";
	import * as BGM from "../lib/BGM.js";

	import {onDestroy} from "svelte";

	$: tabs = $user.name
		? [
				["appearance", "Appearance"],
				["sounds", "Sounds"],
				["privacy", "Privacy"],
				["account", "Account"],
			]
		: [
				["appearance", "Appearance"],
				["sounds", "Sounds"],
			];
	let tab = "appearance";
	$: if (!tabs.some(([key]) => key === tab)) tab = "appearance";

	// the layout this device shows: its own choice, or the account's
	$: layoutNow = $localLayout || $user.layout;
	function setLayout(value) {
		if (layoutNow === value) return;
		if ($localLayout) localLayout.set(value);
		else clm.updateProfile({layout: value});
	}
	function setLayoutSync(sync) {
		if (sync) {
			const value = layoutNow;
			localLayout.set(null);
			if ($user.layout !== value) clm.updateProfile({layout: value});
		} else {
			localLayout.set(layoutNow);
		}
	}

	$: themeLabel = $user.theme.startsWith("custom:")
		? "Custom theme"
		: `${$user.theme.charAt(0).toUpperCase()}${$user.theme.slice(1)} · ${
				($user.mode == null ? !$systemDark : $user.mode) ? "Light" : "Dark"
			}`;

	const formatSize = bytes =>
		bytes < 1024
			? `${bytes} B`
			: bytes < 1048576
			? `${(bytes / 1024).toFixed(1)} KB`
			: `${(bytes / 1048576).toFixed(1)} MB`;

	// --- Data export --------------------------------------------------------
	let exportState = null; // null | {status, completed_at}
	let exportLoaded = false;
	let exportBusy = false;
	let exportError = "";
	let pollTimer = null;

	async function loadExport() {
		try {
			const resp = await fetch(`${apiUrl}me/export`, {headers: $authHeader});
			exportState = resp.ok ? await resp.json() : null;
		} catch {
			exportState = null;
		}
		exportLoaded = true;
		clearTimeout(pollTimer);
		if (exportState && exportState.status === "pending") {
			pollTimer = setTimeout(loadExport, 3000);
		}
	}

	async function requestExport() {
		exportBusy = true;
		exportError = "";
		try {
			const resp = await fetch(`${apiUrl}me/export`, {
				method: "POST",
				headers: $authHeader,
			});
			if (!resp.ok && resp.status !== 429) {
				throw new Error("Response code is not OK; code is " + resp.status);
			}
			await loadExport();
		} catch (e) {
			exportError = `${e.message || e}`;
		}
		exportBusy = false;
	}

	async function downloadExport() {
		exportBusy = true;
		exportError = "";
		try {
			const resp = await fetch(`${apiUrl}me/export/download`, {
				headers: $authHeader,
			});
			if (!resp.ok) {
				throw new Error("Response code is not OK; code is " + resp.status);
			}
			const url = URL.createObjectURL(await resp.blob());
			const a = document.createElement("a");
			a.href = url;
			a.download = `meower-data-${$user.name}.zip`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		} catch (e) {
			exportError = `${e.message || e}`;
		}
		exportBusy = false;
	}

	$: if (tab === "account" && !exportLoaded) loadExport();
	onDestroy(() => clearTimeout(pollTimer));
</script>

<div class="settings">
	<Container>
		<h1>Settings</h1>
		<div class="tabs">
			{#each tabs as [key, label]}
				<button
					type="button"
					class:active={tab === key}
					on:click={() => (tab = key)}>{label}</button
				>
			{/each}
		</div>
	</Container>

	<Container>
		{#if tab === "appearance"}
			<div class="row">
				<div class="row-text">
					<h3>Theme</h3>
					<span class="row-sub">{themeLabel}</span>
				</div>
				<button
					type="button"
					on:click={() => modals.showModal(SwitchThemeModal)}
					>Change</button
				>
			</div>
			<div class="row">
				<div class="row-text">
					<h3>Layout</h3>
					<span class="row-sub"
						>{$modernLayout
							? "You're using the new layout"
							: "Preview a redesigned Meower for mobile and desktop"}</span
					>
				</div>
				<button
					type="button"
					on:click={() => modals.showModal(NewLayoutTourModal)}
					>{$modernLayout ? "Manage" : "Take a look"}</button
				>
			</div>
			<div class="row" class:row-disabled={$modernLayout}>
				<div class="row-text">
					<h3>Sidebar Layout</h3>
					{#if $modernLayout}
						<span class="row-sub">Not used by the new layout</span>
					{/if}
				</div>
				<div class="seg">
					{#each [["new", "Side"], ["old", "Bottom"]] as [value, label]}
						<button
							type="button"
							disabled={$modernLayout}
							class:selected={layoutNow === value}
							on:click={() => setLayout(value)}>{label}</button
						>
					{/each}
				</div>
			</div>
			{#if $user.name}
				<label class="row">
					<div class="row-text">
						<h3>Sync Layout Between Devices</h3>
						<span class="row-sub">Use the same sidebar layout everywhere you're logged in</span>
					</div>
					<input
						type="checkbox"
						checked={!$localLayout}
						on:change={e => setLayoutSync(e.target.checked)}
					/>
				</label>
			{/if}
		{:else if tab === "sounds"}
			<label class="row">
				<div class="row-text">
					<h3>Sound Effects</h3>
					<span class="row-sub">Play a sound for new messages</span>
				</div>
				<input
					type="checkbox"
					bind:checked={$user.sfx}
					on:change={() => clm.updateProfile({sfx: $user.sfx})}
				/>
			</label>
			{#if $user.sfx}
				<label class="row">
					<div class="row-text">
						<h3>Notify me for</h3>
						<span class="row-sub">
							Which messages play a sound. You can also set this per chat from the chat list.
						</span>
					</div>
					<select
						bind:value={$user.sfx_scope}
						on:change={() => clm.updateProfile({sfx_scope: $user.sfx_scope})}
					>
						<option value="all">All messages</option>
						<option value="mentions">Mentions &amp; replies only</option>
					</select>
				</label>
			{/if}
		{:else if tab === "privacy"}
			<label class="row">
				<div class="row-text">
					<h3>Hide Blocked Users</h3>
					<span class="row-sub">Hide posts from people you've blocked</span>
				</div>
				<input
					type="checkbox"
					bind:checked={$user.hide_blocked_users}
					on:change={() => {
						if ($user.hide_blocked_users) {
							modals.showModal(BasicModal, {
								title: "Hide Blocked Users",
								desc: "This setting can have undesirable consequences! We usually try to show 25 posts per page, but pages that include posts made by people you have blocked will have fewer posts. It may also make it harder to keep up with conversations without the context of posts made by people you have blocked.",
							});
						}
						clm.updateProfile({
							hide_blocked_users: $user.hide_blocked_users,
						});
					}}
				/>
			</label>
			<label class="row">
				<div class="row-text">
					<h3>Appear Offline</h3>
					<span class="row-sub">Hide yourself from the online list</span>
				</div>
				<input
					type="checkbox"
					bind:checked={$user.hide_presence}
					on:change={() =>
						clm.updateProfile({hide_presence: $user.hide_presence})}
				/>
			</label>
		{:else if tab === "account"}
			{#if !$user.bot}
				<div class="row">
					<div class="row-text">
						<h3>Username</h3>
						<span class="row-sub">@{$user.name}</span>
					</div>
					<button
						type="button"
						on:click={() => modals.showModal(ChangeUsernameModal)}
						>Change</button
					>
				</div>
			{/if}
			<div class="row">
				<div class="row-text"><h3>Password</h3></div>
				<button
					type="button"
					on:click={() => modals.showModal(ChangePasswordModal)}
					>Change</button
				>
			</div>
			<div class="row">
				<div class="row-text">
					<h3>Two-Factor Authentication</h3>
					<span class="row-sub">Require a code from an authenticator app</span>
				</div>
				<button
					type="button"
					on:click={() => modals.showModal(TwoFactorSettingsModal)}
					>Manage</button
				>
			</div>
			{#if !$user.bot}
				<div class="row">
					<div class="row-text">
						<h3>Email</h3>
						<span class="row-sub">
							{#if $user.email_state?.has_email}
								{$user.email_state.email} ({$user.email_state.verified ? "verified" : "not verified"})
							{:else}
								Add and verify an email address
							{/if}
						</span>
					</div>
					<button type="button" on:click={() => modals.showModal(EmailModal)}>Manage</button>
				</div>
			{/if}
			{#if !$user.bot}
				<div class="row">
					<div class="row-text">
						<h3>Bots</h3>
						<span class="row-sub">Create and manage bot accounts</span>
					</div>
					<button
						type="button"
						on:click={() => $goto("/bots")}
						>Manage</button
					>
				</div>
			{/if}
			<div class="row">
				<div class="row-text">
					<h3>Logout Everywhere</h3>
					<span class="row-sub">Sign out of every session</span>
				</div>
				<button
					type="button"
					on:click={() => modals.showModal(LogoutEverywhereModal)}
					>Log out</button
				>
			</div>
			<div class="row">
				<div class="row-text">
					<h3>Your Data</h3>
					<span class="row-sub">
						{#if !exportLoaded}
							Checking...
						{:else if exportState && exportState.status === "pending"}
							Preparing your export...
						{:else if exportState && exportState.status === "completed"}
							Your export is ready{exportState.size
								? ` · ${formatSize(exportState.size)}`
								: ""}{#if exportState.expires_at}
								· expires <FormattedDate date={exportState.expires_at} />{/if}
						{:else if exportState && exportState.status === "failed"}
							Your last export failed
						{:else}
							Download a copy of your account data
						{/if}
					</span>
					{#if exportError}<span class="row-error">{exportError}</span>{/if}
				</div>
				{#if exportState && exportState.status === "completed"}
					<button type="button" disabled={exportBusy} on:click={downloadExport}
						>Download</button
					>
				{:else}
					<button
						type="button"
						disabled={exportBusy ||
							!exportLoaded ||
							(exportState && exportState.status === "pending")}
						on:click={requestExport}>Request</button
					>
				{/if}
			</div>
			<div class="row">
				<div class="row-text">
					<h3>My Reports</h3>
					<span class="row-sub">See what happened to things you reported</span>
				</div>
				<button type="button" on:click={() => modals.showModal(MyReportsModal)}
					>View</button
				>
			</div>
			<div class="row danger">
				<div class="row-text">
					<h3>Delete Account</h3>
					<span class="row-sub">Permanently delete your account. This can't be undone.</span>
				</div>
				<button
					type="button"
					class="danger-button"
					on:click={() => modals.showModal(DeleteAccountModal)}
					>Delete</button
				>
			</div>
		{/if}
	</Container>
</div>

<!--
	{"cmd": "direct", "val": {"cmd": "del_tokens", "val": ""}, "listener": "del_tokens"}
-->

<style>
	h1 {
		margin: 0 0 0.5em;
	}
	.tabs {
		display: flex;
		gap: 0.5em;
		flex-wrap: wrap;
	}
	.tabs button {
		flex: 1;
		margin: 0;
		background-color: transparent;
		color: var(--foreground);
		border: solid 2px var(--orange);
	}
	.tabs button.active {
		background-color: var(--orange);
		color: white;
		font-weight: bold;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
		padding: 0.75em 0.25em;
		border-bottom: solid 1px var(--orange);
	}
	.row:last-child {
		border-bottom: none;
	}
	label.row,
	.row-toggle-label {
		cursor: pointer;
	}
	.row-text {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
		min-width: 0;
	}
	.row-text h3 {
		margin: 0;
		font-size: 1.05em;
	}
	.row-sub {
		font-size: 0.85em;
		opacity: 0.7;
	}
	.row-error {
		font-size: 0.85em;
		color: crimson;
	}
	.row-actions {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.row button {
		margin: 0;
		flex-shrink: 0;
		min-width: 6em;
	}
	.row input[type="checkbox"] {
		margin: 0;
		flex-shrink: 0;
	}

	.seg {
		display: flex;
		flex-shrink: 0;
	}
	.seg button {
		min-width: 4.5em;
		border-radius: 0;
		background-color: transparent;
		color: var(--foreground);
		border: solid 2px var(--orange);
	}
	.seg button + button {
		border-left-width: 0;
	}
	.seg button:first-child {
		border-radius: 5px 0 0 5px;
	}
	.seg button:last-child {
		border-radius: 0 5px 5px 0;
	}
	.seg button.selected {
		background-color: var(--orange);
		color: white;
		font-weight: bold;
	}
	.seg button:disabled {
		opacity: 0.5;
	}

	.danger-button {
		background-color: crimson !important;
		border-color: crimson !important;
		color: white;
	}
</style>
