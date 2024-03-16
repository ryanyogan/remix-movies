import {
  defer,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/cloudflare";
import {
  Await,
  ClientLoaderFunctionArgs,
  Link,
  useLoaderData,
} from "@remix-run/react";
import { Suspense, useEffect, useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    {
      name: "description",
      content: "Welcome to Remix! Using Vite and Cloudflare!",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { env } = context.cloudflare;

  return defer({
    // @ts-expect-error - We're not using TypeScript here, so we can ignore this error
    query: env.DB.prepare(
      `SELECT * FROM movies WHERE thumbnail != '' ORDER BY RANDOM() LIMIT 12`
    ).all(),
  });
}

// Here we are using a client loader to call the server loader, first
// we check to see if there is a cache, in-memory, of the query data,
// which would give a faster response time, when clicking back.
let cache: unknown;
export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  if (cache) return { query: cache };
  const loaderData = await serverLoader();
  const query = (loaderData as { query: unknown }).query;
  cache = query;
  return { query };
}

clientLoader.hydrate = true;

export default function Index() {
  const { query } = useLoaderData<typeof loader>();

  return (
    <div>
      <p className="text-slate-800 font-light text-sm my-4">
        Use Command + K to search. Here are a few random movies from the
        database.
      </p>
      <Suspense fallback={<Loading />}>
        <Await resolve={query}>
          {(query) => {
            return (
              <ul>
                {query.results.map(
                  (movie: { id: number; title: string; thumbnail: string }) => (
                    <li key={movie.id}>
                      <MovieLink movie={movie} />
                    </li>
                  )
                )}
              </ul>
            );
          }}
        </Await>
      </Suspense>
    </div>
  );
}

export function MovieLink({
  movie,
}: {
  movie: {
    extract?: string;
    thumbnail?: string;
    title?: string;
    id?: number;
  };
}) {
  const [prefetch, setPrefetch] = useState<"intent" | "none">("intent");

  useEffect(() => {
    if (sessionStorage.getItem(`movie-${movie.id}`)) {
      setPrefetch("none");
    }
  }, [movie.id]);

  const prefetchImage = () => {
    if (prefetch === "none") return;
    const img = new Image();
    img.src = movie.thumbnail as string;
  };

  return (
    <Link
      className="text-blue-700 underline text-sm font-semibold"
      to={`/movie/${movie.id}`}
      prefetch={prefetch}
      onMouseEnter={prefetchImage}
      onFocus={prefetchImage}
    >
      {movie.title}
    </Link>
  );
}

function Loading() {
  return (
    <ul>
      {Array.from({ length: 12 }).map((_, i) => (
        <li key={i}>
          <RandomLengthDashes /> <RandomLengthDashes /> <RandomLengthDashes />
        </li>
      ))}
    </ul>
  );
}

function RandomLengthDashes() {
  return <span>{"-".repeat(Math.floor(Math.random() * 20))}</span>;
}
