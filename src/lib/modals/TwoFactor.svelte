<!-- Asks for a 2FA code during login. modalData: {onSubmit(code)} -->
<script>
	import Modal from "../Modal.svelte";

	import * as modals from "../modals.js";

	import {focus} from "@roxi/routify";

	export let modalData;

	let code = "";
	let loading, error;

	// 6-digit authenticator code or 10-character recovery code
	$: cleaned = code.replace(/\s+/g, "");
	$: valid = /^\d{6}$/.test(cleaned) || /^[0-9a-fA-F]{10}$/.test(cleaned);
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Two-Factor Authentication</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				if (!valid) return;
				loading = true;
				error = "";
				try {
					await modalData.onSubmit(cleaned);
					modals.closeLastModal();
				} catch (e) {
					loading = false;
					error =
						e === "I:011 | Invalid Password"
							? "That code didn't work."
							: e === "E:106 | Too many requests"
							? "Too many attempts! Please try again later."
							: `Unexpected ${e} error!`;
				}
			}}
		>
			<p>Enter the code from your authenticator app, or a recovery code.</p>
			<input
				type="text"
				class="modal-input white code-input"
				inputmode="numeric"
				autocomplete="one-time-code"
				placeholder="123456"
				maxlength="12"
				disabled={loading}
				bind:value={code}
				use:focus
			/>
			{#if error}
				<p style="color: crimson;">{error}</p>
			{:else}
				<br />
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click={modals.closeLastModal}>Cancel</button
				>
				<button type="submit" disabled={loading || !valid}
					>Verify</button
				>
			</div>
		</form>
	</div>
</Modal>

<style>
	.code-input {
		width: 100%;
		box-sizing: border-box;
		font-family: monospace;
		font-size: 1.3em;
		letter-spacing: 0.2em;
		text-align: center;
	}
</style>
