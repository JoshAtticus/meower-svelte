<script>
	import Modal from "../../Modal.svelte";
	import {authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";
	import {onMount} from "svelte";

	let domains = [];
	let loaded = false;
	let newDomain = "";
	let error = "";

	async function load() {
		const resp = await fetch(`${apiUrl}admin/email-domains`, {headers: $authHeader});
		if (resp.ok) domains = (await resp.json()).domains || [];
		loaded = true;
	}

	async function add() {
		error = "";
		const domain = newDomain.trim().toLowerCase().replace(/^@/, "");
		const resp = await fetch(`${apiUrl}admin/email-domains/${encodeURIComponent(domain)}`, {method: "PUT", headers: $authHeader});
		if (!resp.ok) {
			error = "That doesn't look like a valid domain.";
			return;
		}
		newDomain = "";
		await load();
	}

	async function remove(domain) {
		await fetch(`${apiUrl}admin/email-domains/${encodeURIComponent(domain)}`, {method: "DELETE", headers: $authHeader});
		await load();
	}

	onMount(load);
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Blocked email domains</h2>
	<div slot="default" class="domains">
		<p>New accounts and email changes using these domains (and their subdomains) are refused.</p>
		<form on:submit|preventDefault={add}>
			<input type="text" class="modal-input white" placeholder="example.com" bind:value={newDomain} />
			<button type="submit" disabled={!newDomain.trim()}>Block</button>
		</form>
		{#if error}<p class="err">{error}</p>{/if}
		<div class="list">
			{#each domains as d (d.domain)}
				<div class="row">
					<span>{d.domain}</span>
					<button class="white" on:click={() => remove(d.domain)}>Unblock</button>
				</div>
			{:else}
				{#if loaded}<p>No domains blocked.</p>{/if}
			{/each}
		</div>
	</div>
</Modal>

<style>
	form {
		display: flex;
		gap: 0.4em;
	}
	form input {
		flex: 1;
		min-width: 0;
	}
	.list {
		max-height: 40vh;
		overflow-y: auto;
		margin-top: 0.6em;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.2em 0;
	}
	.err {
		color: crimson;
	}
</style>
