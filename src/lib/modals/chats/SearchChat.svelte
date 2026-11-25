<!-- Search the messages of the current chat -->
<script>
	import Modal from "../../Modal.svelte";
	import Loading from "../../Loading.svelte";
	import FormattedDate from "../../FormattedDate.svelte";

	import {chat, authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import {addFancyElements} from "../../postFormat.js";
	import * as modals from "../../modals.js";
	import {goto} from "@roxi/routify";
	import {onMount} from "svelte";

	let query = "";
	let results = [];
	let loading = false;
	let searched = false;
	let error = "";
	let timer;
	let inputEl;
	let seq = 0;

	onMount(() => inputEl && inputEl.focus());

	function onInput() {
		clearTimeout(timer);
		timer = setTimeout(run, 300);
	}

	async function run() {
		const q = query.trim();
		const mine = ++seq;
		if (!q) {
			results = [];
			searched = false;
			return;
		}
		loading = true;
		error = "";
		try {
			const resp = await fetch(
				`${apiUrl}search/?q=${encodeURIComponent(q)}&type=posts&chat_id=${$chat._id}`,
				{headers: $authHeader}
			);
			if (!resp.ok) throw new Error("Response code " + resp.status);
			const json = await resp.json();
			if (mine !== seq) return;
			results = (json.autoget || []).filter(i => i.type === "post").map(i => i.post);
			searched = true;
		} catch (e) {
			if (mine === seq) error = "Search failed.";
		} finally {
			if (mine === seq) loading = false;
		}
	}

	function open(post) {
		modals.closeLastModal();
		$goto(`/posts/${post._id}`);
	}
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Search {$chat.nickname || "chat"}</h2>
	<div slot="default" class="search">
		<input
			type="search"
			class="modal-input white"
			placeholder="Search messages"
			maxlength="200"
			bind:this={inputEl}
			bind:value={query}
			on:input={onInput}
		/>
		<div class="results">
			{#if loading}<Loading />{/if}
			{#if error}<p class="note err">{error}</p>{/if}
			{#if searched && !loading && !results.length && !error}
				<p class="note">Nothing found.</p>
			{/if}
			{#each results as post (post._id)}
				<button type="button" class="hit" on:click={() => open(post)}>
					<span class="meta">
						<b>@{post.u}</b>
						<span class="when"><FormattedDate date={post.t.e} /></span>
					</span>
					<span class="text">{@html addFancyElements(post.p || "", null, post.emojis || [])}</span>
				</button>
			{/each}
		</div>
	</div>
</Modal>

<style>
	.search {
		min-width: min(28em, 80vw);
	}
	input {
		width: 100%;
		box-sizing: border-box;
	}
	.results {
		max-height: 55vh;
		overflow-y: auto;
		margin-top: 0.6em;
	}
	.hit {
		display: block;
		width: 100%;
		margin: 0 0 0.3em;
		padding: 0.5em 0.7em;
		text-align: left;
		border: 1px solid rgba(128, 128, 128, 0.35);
		border-radius: 10px;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.meta {
		display: flex;
		gap: 0.6em;
		align-items: baseline;
		font-size: 0.85em;
	}
	.when {
		opacity: 0.6;
	}
	.text {
		display: block;
		max-height: 4.5em;
		overflow: hidden;
		overflow-wrap: anywhere;
	}
	.text :global(p) {
		margin: 0;
	}
	.note {
		opacity: 0.7;
		margin: 0.5em 0;
	}
	.err {
		color: crimson;
	}
</style>
