<script>
	import LoadingImage from "./LoadingImage.svelte";
	import {openViewer} from "./imageViewer.js";

	export let title;
	export let url;
</script>

<div class="AttachmentClass">
	<a
		href={url}
		target="_blank"
		rel="noreferrer"
		on:click|preventDefault={() =>
			openViewer([{src: url, alt: title, downloadUrl: url}])}
	>
		<LoadingImage src={url} alt={title} clickable />
	</a>
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
