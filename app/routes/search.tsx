/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { ClientLoaderFunctionArgs } from "@remix-run/react";
import localforage from "localforage";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useNavigation } from "react-router-dom";
import { MovieLink } from "./_index";

export async function loader({
  request,
  context: {
    cloudflare: { env },
  },
}: LoaderFunctionArgs) {
  let q = new URL(request.url).searchParams.get("q");
  if (!q) return [];

  q = `"${q.replace(/"/g, '""')}"`;

  // @ts-expect-error - TS doesn't know about the sqlite3 API
  const query = await env.DB.prepare(
    `SELECT id, title, extract FROM movies WHERE id in (
      SELECT rowid FROM fts_movies WHERE fts_movies MATCH ?1
    )
    LIMIT 20`
  )
    .bind(q)
    .all();

  return query.results;
}

export async function clientLoader({
  serverLoader,
  request,
}: ClientLoaderFunctionArgs) {
  if (memory.length === 0) {
    replicateMovies();
    return serverLoader();
  }

  const q = new URL(request.url).searchParams.get("q");
  if (!q) return [];

  const matches = [];
  for (const movie of memory) {
    if (
      movie.title.toLowerCase().includes(q) ||
      movie.extract.toLowerCase().includes(q)
    ) {
      matches.push(movie);
    }

    if (matches.length >= 20) break;
  }

  return matches;
}

type Movie = {
  id: number;
  title: string;
  extract: string;
};

let memory: Movie[] = [];
const replicateMovies = async () => {
  const cached = await localforage.getItem("all-movies");
  if (cached) {
    memory = cached as Movie[];
    return;
  }

  const response = await fetch("/all-movies.json");
  const movies = await response.json();
  localforage.setItem("all-movies", movies);
  memory = movies as Movie[];
};

export default function Search() {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLInputElement | null>(null);
  const location = useNavigation();
  const search = useFetcher();

  useEffect(() => {
    if (show && ref.current) {
      ref.current.select();
    }
  }, [show]);

  useEffect(() => {
    setShow(false);
  }, [location]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShow(true);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <>
      <button
        className="text-sm font-bold underline self-start mt-4"
        onClick={() => setShow(true)}
      >
        Search
      </button>
      <div
        onClick={() => {
          setShow(false);
        }}
        hidden={!show}
        className="fixed overflow-hidden top-0 left-0 w-full h-full bg-slate-100/50 z-10"
      >
        <div
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShow(false);
            }
          }}
          className="bg-white w-[600px] mx-20 my-auto border border-slate-100 shadow-md rounded-md"
        >
          <search.Form method="get" action="/search">
            <input
              ref={ref}
              type="search"
              name="q"
              placeholder="Search for a movie"
              className="w-full p-4 sticky top-0 borbder-b border-slate-100 outline-none"
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  event.currentTarget.value === ""
                ) {
                  setShow(false);
                } else {
                  event.stopPropagation();
                }
              }}
              onChange={(event) => {
                search.submit(event.currentTarget.form);
              }}
            />
            <ul className="p-2">
              {search.data &&
                search.data.map(
                  (
                    movie: {
                      extract?: string;
                      thumbnail?: string;
                      title?: string;
                      id?: number;
                    },
                    index: number
                  ) => (
                    <li key={index}>
                      <div>
                        <h3 className="mb-2">
                          <MovieLink movie={movie} />
                        </h3>
                        <p className="mt-0">
                          {movie.extract?.slice(0, 200)}...
                        </p>
                      </div>
                    </li>
                  )
                )}
            </ul>
          </search.Form>
        </div>
      </div>
    </>
  );
}
