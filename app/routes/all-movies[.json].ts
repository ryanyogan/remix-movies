import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";

export async function loader({
  context: {
    cloudflare: { env },
  },
}: LoaderFunctionArgs) {
  // @ts-expect-error - We're not using TypeScript here, so we can ignore this error
  const query = await env.DB.prepare(
    `SELECT id, title, extract, thumbnail FROM movies`
  ).all();

  return json(query.results.reverse(), {
    headers: {
      "Cache-Control": `public, max-age=${60 * 60 * 24}`,
    },
  });
}
