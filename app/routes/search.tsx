import { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({
  request,
  context: {
    cloudflare: { env },
  },
}: LoaderFunctionArgs) {
  let q = new URL(request.url).searchParams.get("q");
  if (!q) return [];

  q = `"${q.replace(/"/g, '""')}"`;
}
