import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { ClientLoaderFunctionArgs, useLoaderData } from "@remix-run/react";

export async function loader({
  params,
  context: {
    cloudflare: { env },
  },
}: LoaderFunctionArgs) {
  // @ts-expect-error - We're not using TypeScript here, so we can ignore this error
  const result = await env.DB.prepare("SELECT * FROM movies WHERE id = ?1")
    .bind(params.id)
    .first();

  return { movie: result };
}

export async function clientLoader({
  serverLoader,
  params,
}: ClientLoaderFunctionArgs) {
  const cachedKey = `movie-${params.id}`;
  const cache = sessionStorage.getItem(cachedKey);
  if (cache) return { movie: JSON.parse(cache) };

  const { movie } = await serverLoader<typeof loader>();
  sessionStorage.setItem(cachedKey, JSON.stringify(movie));
  return { movie };
}

export default function Movie() {
  const { movie } = useLoaderData<typeof loader>();

  return (
    <>
      <title>{movie.title}</title>
      <meta name="description" content={movie.extract} />

      <div className="flex flex-row gap-x-4 mt-4">
        <div className="bg-slate-100">
          <img
            key={movie.id}
            src={movie.thumbnail || "❌"}
            alt={movie.title}
            height={300}
            width={200}
            className={`transition-opacity duration-300 ease-in-out ${
              movie.thumbnail ? "object-cover" : "object-fill"
            }`}
          />
        </div>
        <div className="flex-1">
          <h1 className="font-bold">
            {movie.title} ({movie.year})
          </h1>
          <p>{movie.extract}</p>
        </div>
      </div>
    </>
  );
}
