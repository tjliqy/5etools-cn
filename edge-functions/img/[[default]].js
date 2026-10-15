export async function onRequest (context) {
	const req = context.request;
	const url = new URL(req.url);

	const getCorsHeaders = () => ({
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	});

	if (req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: {
				...getCorsHeaders(),
				"Cache-Control": "no-store",
			},
		});
	}

	const rawPath = context.params.default;
	const path = Array.isArray(rawPath)
		? rawPath.join("/")
		: rawPath || "";

	const headers = new Headers(req.headers);
	headers.delete("host");

	const init = {
		method: req.method,
		headers,
		redirect: "follow",
	};

	if (req.method !== "GET" && req.method !== "HEAD") init.body = req.body;

	const upstreamUrls = [
		`https://5e.tools/img/${path}${url.search}`,
		`https://82.157.116.166/img/${path}${url.search}`,
	];

	let res = null;
	for (const upstreamUrl of upstreamUrls) {
		try {
			res = await fetch(upstreamUrl, init);
			if (res.ok) break;
		} catch (e) {
			res = null;
		}
	}

	if (!res) {
		return new Response("所有上游来源的图片均加载失败。", {
			status: 502,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store",
				...getCorsHeaders(),
			},
		});
	}

	const outHeaders = new Headers(res.headers);
	if (res.ok) outHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
	else outHeaders.set("Cache-Control", "no-store");
	Object.entries(getCorsHeaders()).forEach(([key, value]) => outHeaders.set(key, value));

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: outHeaders,
	});
}
