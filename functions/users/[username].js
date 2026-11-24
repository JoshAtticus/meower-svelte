import {getJson, trunc, uploadUrl, withMeta} from "../_lib/og.js";

export async function onRequestGet(context) {
	try {
		const user = await getJson(context.env, `users/${encodeURIComponent(context.params.username)}`);
		if (user && user._id) {
			const name = user.display_name || user._id;
			return await withMeta(context, {
				title: user.display_name ? `${name} (@${user._id}) on Meower` : `@${user._id} on Meower`,
				description: trunc(user.quote, 200) || `View ${name}'s profile on Meower.`,
				image: uploadUrl(context.env, "icons", user.avatar),
			});
		}
	} catch {}
	return context.next();
}
