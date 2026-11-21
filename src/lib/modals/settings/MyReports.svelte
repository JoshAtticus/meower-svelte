<script>
	import Modal from "../../Modal.svelte";
	import FormattedDate from "../../FormattedDate.svelte";

	import {authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {goto} from "@roxi/routify";
	import {onMount} from "svelte";

	const STATUS = {
		pending: "Under review",
		no_action_taken: "No action taken",
		action_taken: "Action taken",
	};

	let reports = [];
	let page = 1;
	let pages = 1;
	let loading = true;
	let error = "";

	async function load(p = 1) {
		loading = true;
		try {
			const resp = await fetch(`${apiUrl}me/reports?page=${p}`, {
				headers: $authHeader,
			});
			if (!resp.ok) {
				throw new Error("Response code is not OK; code is " + resp.status);
			}
			const json = await resp.json();
			reports = p === 1 ? json.autoget : [...reports, ...json.autoget];
			page = p;
			pages = json.pages || 1;
		} catch (e) {
			error = `${e.message || e}`;
		}
		loading = false;
	}

	function target(report) {
		if (report.type === "user") return `@${report.content_id}`;
		const author = report.content && report.content.u;
		return author ? `Post by @${author}` : "Deleted post";
	}

	onMount(() => load(1));
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">My Reports</h2>
	<div slot="default">
		{#if error}
			<p class="error">{error}</p>
		{:else if !loading && !reports.length}
			<p class="empty">You haven't reported anything.</p>
		{:else}
			<div class="report-list">
				{#each reports as report (report._id)}
					<div class="report">
						<div class="report-top">
							{#if report.type === "post" && report.content && !report.content.isDeleted}
								<button
									type="button"
									class="report-target link"
									on:click={() => {
										modals.closeAllModals();
										$goto(`/posts/${report.content_id}`);
									}}>{target(report)}</button
								>
							{:else if report.type === "user"}
								<button
									type="button"
									class="report-target link"
									on:click={() => {
										modals.closeAllModals();
										$goto(`/users/${report.content_id}`);
									}}>{target(report)}</button
								>
							{:else}
								<span class="report-target">{target(report)}</span>
							{/if}
							<span
								class="report-status"
								class:pending={report.status === "pending"}
								class:actioned={report.status === "action_taken"}
								>{STATUS[report.status] || report.status}</span
							>
						</div>
						<div class="report-meta">
							{report.reason}
							· <FormattedDate date={report.time} />
						</div>
						{#if report.comment}
							<div class="report-comment">{report.comment}</div>
						{/if}
					</div>
				{/each}
			</div>
			{#if page < pages}
				<div class="more">
					<button type="button" disabled={loading} on:click={() => load(page + 1)}
						>{loading ? "Loading..." : "Load more"}</button
					>
				</div>
			{/if}
		{/if}
	</div>
</Modal>

<style>
	.report-list {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		max-height: 60vh;
		overflow-y: auto;
	}
	.report {
		border: solid 2px var(--orange);
		border-radius: 5px;
		padding: 0.5em 0.6em;
	}
	.report-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5em;
	}
	.report-target {
		font-weight: bold;
	}
	.report-target.link {
		margin: 0;
		padding: 0;
		border: none;
		background: none !important;
		color: inherit;
		font: inherit;
		font-weight: bold;
		text-decoration: underline;
		cursor: pointer;
	}
	.report-status {
		font-size: 0.8em;
		padding: 0.1em 0.5em;
		border-radius: 1em;
		border: solid 2px var(--orange);
		flex-shrink: 0;
	}
	.report-status.pending {
		opacity: 0.75;
	}
	.report-status.actioned {
		background-color: var(--orange);
		color: white;
	}
	.report-meta {
		font-size: 0.85em;
		opacity: 0.75;
		margin-top: 0.2em;
	}
	.report-comment {
		font-size: 0.85em;
		margin-top: 0.3em;
		overflow-wrap: anywhere;
	}
	.more {
		display: flex;
		justify-content: center;
		margin-top: 0.5em;
	}
	.empty {
		opacity: 0.7;
	}
	.error {
		color: crimson;
	}
</style>
