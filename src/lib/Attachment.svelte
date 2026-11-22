<!--
    Generic Meower attachment wrapper
-->

<script>
	import { uploadsUrl } from "./urls";
	import VideoPlayer from "./VideoPlayer.svelte";

	export let id;
	export let filename;
	export let mime;

	let url;
	let previewUrl;
	$: {
		url = `${uploadsUrl}attachments/${id}/${filename}`;
		previewUrl = `${url}?preview`;
	}
</script>

<div class="AttachmentClass">
	{#if mime.startsWith("video/")}
		<VideoPlayer src={previewUrl} downloadUrl={url} {filename} />
	{:else}
		<a href={url} target="_blank" rel="noreferrer">
			{#if mime.startsWith("image/")}
				<img src={previewUrl} alt={filename} class="post-image" />
			{:else if mime.startsWith("audio/")}
				<!-- svelte-ignore a11y-media-has-caption -->
				<audio controls>
					<source src={previewUrl} />
				</audio>
			{:else}
				{filename}
			{/if}
		</a>
	{/if}
</div>

<style>
	.post-image {
		max-height: 12em;
		max-width: 100%;
		border-radius: 5px;
		overflow: hidden;
	}
</style>
