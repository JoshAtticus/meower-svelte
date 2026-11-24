import {getJson, trunc, uploadUrl, withMeta} from "../_lib/og.js";

export async function onRequestGet(context) {
	try {
		const post = await getJson(context.env, `posts?id=${encodeURIComponent(context.params.postid)}`);
		if (post && post._id) {
			const name = (post.author && post.author.display_name) || post.u;
			const picture = (post.attachments || []).find(a => (a.mime || "").startsWith("image/"));
			return await withMeta(context, {
				title: `${name} on Meower`,
				description: trunc(post.p, 280) || (picture ? "Shared an image." : "View this post on Meower."),
				image: picture
					? uploadUrl(context.env, "attachments", picture.id, picture.filename)
					: post.author && post.author.avatar
					? uploadUrl(context.env, "icons", post.author.avatar)
					: null,
				large: !!picture,
			});
		}
	} catch {}
	return context.next();
}
