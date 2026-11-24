<script>
	import Modal from "../../Modal.svelte";

	import CustomThemeModal from "./CustomTheme.svelte";
	import ThemePreview from "../../ThemePreview.svelte";
	import profileIcon from "../../../assets/profile.svg";

	import {user, OOBERunning} from "../../stores.js";
	import {removeTheme} from "../../CustomTheme.js";
	import {THEMES, validProfileColor} from "../../themes.js";
	import * as modals from "../../modals.js";
	import * as clm from "../../clmanager.js";
	import {systemDarkMode} from "../../responsiveness.js";

	export let fromoobe = false;

	// every choice in the colour list
	$: options = [
		...THEMES.map(t => ({id: t.id, name: t.name, color: t.light.main})),
		{
			id: "profile",
			name: "Profile",
			color: validProfileColor($user.avatar_color)
				? `#${$user.avatar_color}`
				: THEMES[0].light.main,
		},
		{id: "custom", name: "Custom", color: null},
	];

	let darkMode = $user.mode == null ? systemDarkMode() : $user.mode === false;
	let theme = $user.theme || "orange";
	let error = false;
	if (theme.startsWith("custom:")) {
		theme = "custom";
	} else if (!THEMES.some(t => t.id === theme) && theme !== "profile") {
		theme = "orange";
		error = true;
	}

	$: current = options.find(o => o.id === theme);

	function apply() {
		removeTheme();
		const _user = $user;
		_user.theme = theme;
		_user.mode = !darkMode;
		user.set(_user);
		clm.updateProfile({theme, mode: !darkMode});
	}

	function pick(id) {
		theme = id;
		if (id === "custom") {
			modals.showModal(CustomThemeModal);
			return;
		}
		if (fromoobe || $OOBERunning) apply();
	}

	function setDark(value) {
		darkMode = value;
		if ((fromoobe || $OOBERunning) && theme !== "custom") apply();
	}
</script>

{#if !fromoobe}
	<Modal on:close={modals.closeLastModal}>
		<h2 slot="header">Select a Theme</h2>
		<div slot="default">
			<div class="picker">
				<ThemePreview {theme} dark={darkMode} accent={$user.avatar_color} />
				<div class="theme-name">{current ? current.name : ""}</div>
				<div class="swatches" role="radiogroup" aria-label="Theme colour">
					{#each options as o (o.id)}
						<button
							type="button"
							class="swatch"
							class:selected={theme === o.id}
							class:custom={o.id === "custom"}
							class:profile={o.id === "profile"}
							style:--profile-icon={`url(${profileIcon})`}
							style:background={o.color}
							title={o.name}
							aria-label={o.name}
							role="radio"
							aria-checked={theme === o.id}
							on:click={() => pick(o.id)}
						/>
					{/each}
				</div>
				<label class="dark-row">
					<b>Dark mode</b>
					<input
						type="checkbox"
						checked={darkMode}
						on:change={e => setDark(e.target.checked)}
					/>
				</label>
			</div>
			{#if error}
				<p class="theme-invalid">
					Your previous theme was invalid, so it was reset to orange.
				</p>
			{/if}
			<div class="modal-buttons">
				<button on:click={modals.closeLastModal}>Close</button>
				<button
					disabled={theme === "custom"}
					on:click={() => {
						apply();
						modals.closeLastModal();
					}}>Save</button
				>
			</div>
		</div>
	</Modal>
{:else}
	<div class="picker">
		<ThemePreview {theme} dark={darkMode} accent={$user.avatar_color} />
		<div class="theme-name">{current ? current.name : ""}</div>
		<div class="swatches" role="radiogroup" aria-label="Theme colour">
			{#each options.filter(o => o.id !== "custom") as o (o.id)}
				<button
					type="button"
					class="swatch"
					class:selected={theme === o.id}
					class:profile={o.id === "profile"}
					style:--profile-icon={`url(${profileIcon})`}
					style:background={o.color}
					title={o.name}
					aria-label={o.name}
					role="radio"
					aria-checked={theme === o.id}
					on:click={() => pick(o.id)}
				/>
			{/each}
		</div>
		<label class="dark-row">
			<b>Dark mode</b>
			<input
				type="checkbox"
				checked={darkMode}
				on:change={e => setDark(e.target.checked)}
			/>
		</label>
	</div>
{/if}

<style>
	.picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6em;
		margin: 0.5em 0 1em;
	}
	.theme-name {
		font-size: 1.4rem;
		font-weight: bold;
	}
	.swatches {
		display: flex;
		gap: 0.6em;
		max-width: 100%;
		overflow-x: auto;
		padding: 0.4em;
		box-sizing: border-box;
		scrollbar-width: thin;
	}
	.swatch {
		flex-shrink: 0;
		width: 2.4em;
		height: 2.4em;
		min-width: 0;
		padding: 0;
		margin: 0;
		border-radius: 50%;
		border: solid 3px #fff;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
		cursor: pointer;
	}
	.swatch.custom {
		background: conic-gradient(#ff3838, #f9a636, #57e389, #4d97ff, #a85ff5, #ff8af7, #ff3838);
	}
	/* the Profile circle shows a profile icon over your colour */
	.swatch.profile {
		background-image: var(--profile-icon) !important;
		background-repeat: no-repeat !important;
		background-position: center !important;
		background-size: 50% !important;
	}
	.swatch.selected {
		box-shadow: 0 0 0 3px var(--orange);
		transform: scale(1.08);
	}
	.dark-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
		width: 100%;
		max-width: 22em;
		cursor: pointer;
	}
	.dark-row input {
		margin: 0;
	}
	.theme-invalid {
		text-align: center;
		width: 100%;
	}
</style>
