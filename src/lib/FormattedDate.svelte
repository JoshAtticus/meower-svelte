<!--
	Formatted date display with hover text.
	Shows a live relative time ("5 minutes ago", "in 3 hours"); the exact
	time is in the tooltip. Pass relative={false} for an absolute time.
-->
<script>
	import {relativeDate, now} from "./relativeDate.js";

	// 32-bit UTC time (1 is 1 second instead of 1 millisecond)
	export let date = 0;
	export let relative = true;
	export let customText = "";

	let text, title;

	$: {
		const _date = new Date(date * 1000);
		text = relative ? relativeDate(date, $now) : _date.toLocaleString();

		title = `${_date.toLocaleString()}
Time is in your local timezone (UTC+${-(_date.getTimezoneOffset() / 60)}).
12-hour time: ${_date.toLocaleString([], {hourCycle: "h11"})}
24-hour time: ${_date.toLocaleString([], {hourCycle: "h23"})}
ISO: ${_date.toISOString()}`;
	}
</script>

<span {title} class="date">
	{customText || text}
</span>

<style>
	.date {
		font-style: italic;
		cursor: help;
	}
</style>
