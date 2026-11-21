<!-- Generic confirmation: modalData {title, desc, confirmLabel, onConfirm} -->
<script>
	import Modal from "../Modal.svelte";

	import * as modals from "../modals.js";

	import {focus} from "@roxi/routify";

	export let modalData;

	let {title, desc, confirmLabel = "Confirm", onConfirm} = modalData;

	let loading, error;
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">{title}</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					await onConfirm();
					modals.closeLastModal();
				} catch (e) {
					loading = false;
					error = e;
				}
			}}
		>
			<p>{desc}</p>
			{#if error}
				<p style="color: crimson;">{error}</p>
			{:else}
				<br />
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click|preventDefault={modals.closeLastModal}
					>Cancel</button
				>
				<button type="submit" disabled={loading} use:focus
					>{confirmLabel}</button
				>
			</div>
		</form>
	</div>
</Modal>
