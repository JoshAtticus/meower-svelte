<!--
    Generic Meower attachment wrapper
-->

<script>
	import { uploadsUrl } from "./urls";
	import VideoPlayer from "./VideoPlayer.svelte";
	import LoadingImage from "./LoadingImage.svelte";
	import { openViewer } from "./imageViewer.js";

	export let id;
	export let filename;
	export let mime;
	export let size = 0;
	export let width = 0;
	export let height = 0;
	export let thumbhash = "";
	// all attachments of the post, so the viewer can page through the images
	export let siblings = null;

	const urlFor = a => `${uploadsUrl}attachments/${a.id}/${a.filename}`;

	let url;
	let previewUrl;
	$: {
		url = `${uploadsUrl}attachments/${id}/${filename}`;
		// Thumbnails are small and lossy: use the real file when it's light
		// enough (animated images always, since their thumbnails look rough)
		const light =
			size && size < (mime === "image/gif" ? 10 : 1.5) * 1024 * 1024;
		previewUrl = light ? url : `${url}?preview`;
	}

	function view(e) {
		e.preventDefault();
		const images = (siblings || [{id, filename, mime}]).filter(a =>
			a.mime.startsWith("image/")
		);
		openViewer(
			images.map(a => ({
				src: urlFor(a),
				alt: a.filename,
				downloadUrl: urlFor(a),
			})),
			Math.max(
				0,
				images.findIndex(a => a.id === id)
			)
		);
	}
</script>

<div class="AttachmentClass">
	{#if mime.startsWith("video/")}
		<VideoPlayer src={previewUrl} downloadUrl={url} {filename} />
	{:else if mime.startsWith("image/")}
		<a href={url} target="_blank" rel="noreferrer" on:click={view}>
			<LoadingImage
				src={previewUrl}
				alt={filename}
				{width}
				{height}
				{thumbhash}
				clickable
			/>
		</a>
	{:else}
		<a href={url} target="_blank" rel="noreferrer">
			{#if mime.startsWith("audio/")}
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
	.AttachmentClass {
		max-width: 100%;
		min-width: 0;
	}
	.AttachmentClass a {
		display: block;
		max-width: 100%;
	}
</style>
