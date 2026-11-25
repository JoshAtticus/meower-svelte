<script>
	import Modal from "../Modal.svelte";
	import EmailModal from "./settings/Email.svelte";
	import * as modals from "../modals.js";
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Verify your email</h2>
	<div slot="default">
		<p>
			You need a verified email address to do that. Verified accounts can send
			messages in chats, react, upload files, use custom emoji, and send friend
			requests, message requests and chat invites.
		</p>
		<div class="modal-buttons">
			<button on:click={() => modals.replaceLastModal(EmailModal)}>Verify email</button>
			<button on:click={modals.closeLastModal}>Not now</button>
		</div>
	</div>
</Modal>
