<!-- Which messages in one chat play a sound. modalData: {chat} -->
<script>
	import Modal from "../../Modal.svelte";

	import {user} from "../../stores.js";
	import * as modals from "../../modals.js";
	import * as clm from "../../clmanager.js";

	export let modalData;
	const chat = modalData.chat;

	$: value = ($user.chat_sfx || {})[chat._id] || "default";

	function choose(next) {
		const map = {...($user.chat_sfx || {})};
		if (next === "default") delete map[chat._id];
		else map[chat._id] = next;
		$user.chat_sfx = map;
		clm.updateProfile({chat_sfx: map});
	}

	$: globalLabel =
		$user.sfx_scope === "mentions" ? "Mentions & replies only" : "All messages";
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Notification sounds</h2>
	<div slot="default">
		{#if !$user.sfx}
			<p class="info">Sound effects are off in your settings, so nothing will play.</p>
		{/if}
		{#each [["default", `Use my default (${globalLabel})`], ["all", "All messages"], ["mentions", "Mentions & replies only"]] as [id, label]}
			<label class="option">
				<input
					type="radio"
					name="chat-sfx"
					checked={value === id}
					on:change={() => choose(id)}
				/>
				{label}
			</label>
		{/each}
		<div class="modal-buttons">
			<button on:click={modals.closeLastModal}>Done</button>
		</div>
	</div>
</Modal>

<style>
	.info {
		margin: 0 0 0.8em;
		font-size: 0.85em;
		opacity: 0.75;
	}
	.option {
		display: flex;
		align-items: center;
		gap: 0.7em;
		margin: 0.5em 0;
		cursor: pointer;
	}
	.modal-buttons {
		margin-top: 1em;
	}
</style>
