<script>
	export let src;
	export let poster = "";
	export let downloadUrl = "";
	export let filename = "video";

	let videoEl;
	let containerEl;
	let paused = true;
	let currentTime = 0;
	let duration = 0;
	let muted = false;
	let volume = 1;
	let fullscreen = false;
	let hovering = false;
	let seeking = false;

	function formatTime(t) {
		if (!Number.isFinite(t) || t < 0) return "0:00";
		const mins = Math.floor(t / 60);
		const secs = Math.floor(t % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	function togglePlay() {
		if (!videoEl) return;
		if (videoEl.paused) {
			videoEl.play().catch(() => {});
		} else {
			videoEl.pause();
		}
	}

	function toggleMute() {
		if (!videoEl) return;
		videoEl.muted = !videoEl.muted;
		muted = videoEl.muted;
	}

	function onSeekInput(e) {
		if (!videoEl || !duration) return;
		const val = parseFloat(e.target.value);
		currentTime = val;
		videoEl.currentTime = val;
	}

	function onVolumeInput(e) {
		if (!videoEl) return;
		const val = parseFloat(e.target.value);
		volume = val;
		videoEl.volume = val;
		videoEl.muted = val === 0;
		muted = videoEl.muted;
	}

	function toggleFullscreen() {
		if (!containerEl) return;
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		} else if (containerEl.requestFullscreen) {
			containerEl.requestFullscreen().catch(() => {});
		} else if (videoEl && videoEl.webkitEnterFullscreen) {
			videoEl.webkitEnterFullscreen();
		}
	}

	function onFullscreenChange() {
		fullscreen = document.fullscreenElement === containerEl;
	}

	$: progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
	$: showControls = paused || hovering || seeking;
</script>

<svelte:document on:fullscreenchange={onFullscreenChange} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="meower-video"
	class:fullscreen
	bind:this={containerEl}
	on:mouseenter={() => (hovering = true)}
	on:mouseleave={() => (hovering = false)}
>
	<!-- svelte-ignore a11y-media-has-caption -->
	<video
		bind:this={videoEl}
		{src}
		{poster}
		playsinline
		preload="metadata"
		bind:paused
		bind:duration
		bind:muted
		bind:volume
		on:timeupdate={() => {
			if (!seeking && videoEl) currentTime = videoEl.currentTime;
		}}
		on:click={togglePlay}
	/>

	{#if paused}
		<button
			type="button"
			class="center-play"
			aria-label="Play video"
			on:click={togglePlay}
		>
			<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M8 5v14l11-7z" />
			</svg>
		</button>
	{/if}

	<div class="controls" class:visible={showControls}>
		<input
			type="range"
			class="seek"
			min="0"
			max={duration || 0}
			step="0.05"
			value={currentTime}
			aria-label="Seek"
			style:--progress="{progress}%"
			on:mousedown={() => (seeking = true)}
			on:mouseup={() => (seeking = false)}
			on:touchstart={() => (seeking = true)}
			on:touchend={() => (seeking = false)}
			on:input={onSeekInput}
		/>
		<div class="controls-row">
			<button
				type="button"
				class="ctrl-btn"
				aria-label={paused ? "Play" : "Pause"}
				on:click={togglePlay}
			>
				{#if paused}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M6 5h4v14H6zm8 0h4v14h-4z" />
					</svg>
				{/if}
			</button>

			<span class="time">
				{formatTime(currentTime)} / {formatTime(duration)}
			</span>

			<div class="spacer" />

			<div class="vol-wrap">
				<button
					type="button"
					class="ctrl-btn"
					aria-label={muted ? "Unmute" : "Mute"}
					on:click={toggleMute}
				>
					{#if muted || volume === 0}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M11 5L6 9H2v6h4l5 4V5z" />
							<line x1="23" y1="9" x2="17" y2="15" />
							<line x1="17" y1="9" x2="23" y2="15" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M11 5L6 9H2v6h4l5 4V5z" />
							<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
						</svg>
					{/if}
				</button>
				<input
					type="range"
					class="vol"
					min="0"
					max="1"
					step="0.05"
					value={muted ? 0 : volume}
					aria-label="Volume"
					on:input={onVolumeInput}
				/>
			</div>

			{#if downloadUrl}
				<a
					class="ctrl-btn"
					href={downloadUrl}
					download={filename}
					target="_blank"
					rel="noreferrer"
					aria-label="Download video"
					title="Download"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
				</a>
			{/if}

			<button
				type="button"
				class="ctrl-btn"
				aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
				on:click={toggleFullscreen}
			>
				{#if fullscreen}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.meower-video {
		position: relative;
		display: inline-block;
		max-width: 100%;
		border-radius: 10px;
		overflow: hidden;
		background: #000;
		line-height: 0;
		user-select: none;
	}
	.meower-video video {
		display: block;
		max-height: 16em;
		max-width: 100%;
		cursor: pointer;
	}
	.meower-video.fullscreen {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		border-radius: 0;
	}
	.meower-video.fullscreen video {
		max-height: 100vh;
		max-width: 100vw;
	}

	.center-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 3em;
		height: 3em;
		border-radius: 50%;
		border: none;
		padding: 0;
		margin: 0;
		background: color-mix(in srgb, var(--orange) 90%, transparent);
		color: var(--foreground-orange, #fff);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
		transition: transform 0.12s ease;
	}
	.center-play:hover {
		transform: translate(-50%, -50%) scale(1.08);
	}
	.center-play svg {
		width: 1.5em;
		height: 1.5em;
		margin-left: 0.12em;
	}

	.controls {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 1.2em 0.5em 0.35em;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.78));
		color: #fff;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}
	.controls.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.seek {
		width: 100%;
		height: 4px;
		margin: 0 0 0.3em;
		appearance: none;
		background: linear-gradient(
			to right,
			var(--orange) var(--progress),
			rgba(255, 255, 255, 0.3) var(--progress)
		);
		border-radius: 999px;
		cursor: pointer;
		outline: none;
		border: none;
		padding: 0;
	}
	.seek::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--orange);
		border: 2px solid #fff;
		cursor: pointer;
	}
	.seek::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--orange);
		border: 2px solid #fff;
		cursor: pointer;
	}

	.controls-row {
		display: flex;
		align-items: center;
		gap: 0.35em;
		line-height: 1;
	}
	.ctrl-btn {
		background: transparent;
		border: none;
		color: #fff;
		padding: 0.25em;
		margin: 0;
		min-width: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border-radius: 6px;
	}
	.ctrl-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	.ctrl-btn svg {
		width: 1.05em;
		height: 1.05em;
	}

	.time {
		font-size: 0.72em;
		font-variant-numeric: tabular-nums;
		opacity: 0.9;
	}
	.spacer {
		flex: 1;
	}

	.vol-wrap {
		display: flex;
		align-items: center;
		gap: 0.2em;
	}
	.vol {
		width: 0;
		opacity: 0;
		transition: width 0.15s ease, opacity 0.15s ease;
		appearance: none;
		height: 3px;
		background: rgba(255, 255, 255, 0.35);
		border-radius: 999px;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
	}
	.vol-wrap:hover .vol {
		width: 48px;
		opacity: 1;
	}
	.vol::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--orange);
		cursor: pointer;
	}
</style>
