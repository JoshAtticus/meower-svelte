<script>
	import Modal from "../Modal.svelte";
	import PFP from "../PFP.svelte";
	import BasicModal from "./Basic.svelte";

	import {user, authHeader} from "../stores.js";
	import {uploadsUrl} from "../urls.js";
	import {profileCache} from "../loadProfile.js";
	import {userRestrictions, isRestricted} from "../bitField.js";
	import * as modals from "../modals.js";
	import * as clm from "../clmanager.js";

	export let modalData = {};

	const PFP_COUNT = 34;
	const pfps = new Array(PFP_COUNT).fill().map((_, i) => i + 1);

	let tab = (modalData && modalData.tab) || "picture";

	let fileInput, uploading;

	function clearCache() {
		if ($profileCache[$user.name]) delete $profileCache[$user.name];
	}

	async function upload() {
		const file = fileInput.files[0];
		if (!file) return;
		uploading = true;
		try {
			const form = new FormData();
			form.append("file", file);
			const resp = await fetch(`${uploadsUrl}icons`, {
				method: "POST",
				headers: {Authorization: $authHeader.token},
				body: form,
			});
			if (!resp.ok) {
				if (resp.status === 413) {
					throw new Error("That image is too large.");
				}
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			const uploaded = await resp.json();
			clearCache();
			await clm.updateProfile({avatar: uploaded.id});
		} catch (e) {
			modals.showModal(BasicModal, {
				title: "Failed to upload profile picture",
				desc: `${e}`,
			});
		} finally {
			uploading = false;
		}
	}
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Edit Profile</h2>
	<div slot="default">
		<div class="tabs">
			<button
				class:active={tab === "picture"}
				on:click={() => (tab = "picture")}>Picture</button
			>
			<button
				class:active={tab === "quote"}
				on:click={() => (tab = "quote")}>Quote</button
			>
			<button
				class:active={tab === "colour"}
				on:click={() => (tab = "colour")}>Colour</button
			>
		</div>

		{#if tab === "picture"}
			<div class="preview">
				<PFP
					icon={$user.pfp_data}
					avatar={$user.avatar}
					avatarColor={$user.avatar_color}
					alt="Your profile picture"
					size={1.4}
				/>
			</div>

			<div class="custom-controls">
				<input
					type="file"
					accept="image/*"
					bind:this={fileInput}
					on:change={upload}
					disabled={uploading}
					hidden
				/>
				<button
					disabled={uploading}
					on:click={() => fileInput.click()}
				>
					{uploading ? "Uploading..." : "Upload a picture"}
				</button>
				{#if $user.avatar}
					<button
						on:click={() => {
							clearCache();
							clm.updateProfile({avatar: ""});
						}}>Remove picture</button
					>
				{/if}
			</div>

			<div class="pfp-grid">
				{#each pfps as pfp}
					<button
						class="pfp-option"
						class:selected={!$user.avatar &&
							$user.pfp_data === pfp}
						on:click={() => {
							clearCache();
							clm.updateProfile({pfp_data: pfp, avatar: ""});
						}}
					>
						<PFP
							icon={pfp}
							avatarColor={$user.avatar_color}
							alt="Profile picture {pfp}"
						/>
					</button>
				{/each}
			</div>
		{:else if tab === "quote"}
			<input
				type="text"
				class="modal-input white"
				style="font-style: italic; width: 100%; box-sizing: border-box;"
				placeholder="Write something..."
				maxlength="360"
				disabled={isRestricted(userRestrictions.EDITING_QUOTE)}
				bind:value={$user.quote}
				on:change={() => clm.updateProfile({quote: $user.quote})}
			/>
		{:else if tab === "colour"}
			<div class="color-picker">
				<label
					class="color-swatch"
					style:background-color={$user.avatar_color &&
					$user.avatar_color !== "000000"
						? `#${$user.avatar_color}`
						: "transparent"}
				>
					<input
						type="color"
						value={`#${$user.avatar_color || "000000"}`}
						on:change={e =>
							clm.updateProfile({
								avatar_color: e.target.value.substring(1),
							})}
					/>
				</label>
				<span class="color-hex">
					{$user.avatar_color && $user.avatar_color !== "000000"
						? `#${$user.avatar_color}`
						: "Not Set"}
				</span>
				{#if $user.avatar_color && $user.avatar_color !== "000000"}
					<button
						style="margin-left: auto;"
						on:click={() =>
							clm.updateProfile({avatar_color: "000000"})}
						>Clear</button
					>
				{/if}
			</div>
		{/if}
	</div>
</Modal>

<style>
	.tabs {
		display: flex;
		gap: 0.5em;
		margin-bottom: 1em;
	}
	.tabs button {
		flex: 1;
		opacity: 0.7;
	}
	.tabs button.active {
		opacity: 1;
		font-weight: bold;
	}

	.preview {
		display: flex;
		justify-content: center;
		margin-bottom: 0.75em;
	}
	.custom-controls {
		display: flex;
		justify-content: center;
		gap: 0.5em;
		margin-bottom: 1em;
	}

	.pfp-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		max-height: 16em;
		overflow-y: auto;
	}
	.pfp-option {
		padding: 0.2em;
		margin: 0.2em;
		border-radius: 1.45em;
		display: inline-block;
		background: none;
		border: none;
	}
	:global(main.input-hover) .pfp-option:hover,
	:global(main.input-touch) .pfp-option:active {
		background-color: var(--orange-light);
	}
	.pfp-option.selected {
		background-color: var(--orange);
	}

	.color-picker {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.color-swatch {
		display: inline-block;
		width: 2.4em;
		height: 2.4em;
		border-radius: 0.6em;
		border: solid 2px var(--foreground);
		cursor: pointer;
	}
	.color-swatch input {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}
	.color-hex {
		font-family: monospace;
		font-size: 1.1em;
	}
</style>
