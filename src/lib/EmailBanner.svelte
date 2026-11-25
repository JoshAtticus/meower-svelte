<!-- Reminder shown on every page until the account's email is verified -->
<script>
	import Container from "./Container.svelte";
	import EmailModal from "./modals/settings/Email.svelte";
	import {user} from "./stores.js";
	import * as modals from "./modals.js";

	$: state = $user.email_state;
	$: show = $user.name && state && !state.verified && !state.exempt;
	$: days = state && state.deadline ? Math.max(0, Math.ceil((state.deadline - Date.now() / 1000) / 86400)) : 0;
</script>

{#if show}
	<Container warning={state.required}>
		<div class="banner">
			<span>
				{#if state.required}
					<b>Verify your email.</b>
					{state.has_email ? "Check your inbox for the link, or resend it." : "Add an email to send messages, react, upload files and more."}
				{:else}
					<b>Verify your email within {days} day{days === 1 ? "" : "s"}</b> to keep using most features.
				{/if}
			</span>
			<button on:click={() => modals.showModal(EmailModal)}>{state.has_email ? "Verify" : "Add email"}</button>
		</div>
	</Container>
{/if}

<style>
	.banner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6em;
	}
</style>
