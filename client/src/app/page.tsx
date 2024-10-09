"use client";
import { useState } from "react";
import Image from "next/image";
import loader from "../../public/805.svg";
import { yt_metadata, web_metadata } from "./types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<yt_metadata | web_metadata | null>(null);

  const verifyUrl = async (url: string) => {
    if (url) {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/metadata?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setMetadata(data);
        console.log(data);
        setError(null); // Reset error state
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Type guard to check if metadata is yt_metadata
  const isYouTubeMetadata = (metadata: yt_metadata | web_metadata): metadata is yt_metadata => {
    return (metadata as yt_metadata).thumbnail_url !== undefined;
  };

  return (
    <div className="h-screen w-screen flex justify-center items-center font-mono">
      <div className="flex flex-col gap-10 w-[800px]">
        <h3 className="text-gray-100 font-bold text-4xl">
          Get Instant Summarization Of YouTube Videos & Websites
        </h3>

        <div className="flex">
          <input
            type="text"
            onChange={({ target }) => verifyUrl(target.value)}
            className="bg-gray-700 py-4 w-full rounded-s-full pl-6 outline-none"
            placeholder="e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/"
          />

          <span className="pr-10 bg-gray-700 rounded-e-full flex gap-1 items-center justify-center text-gray-400">
            {loading ? (
              <>
                <Image src={loader} alt="loader" width="20" height="20" />
                <p className="text-gray-400">Searching</p>
              </>
            ) : (
              metadata && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15L15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                    />
                  </svg>
                  <p>Verified</p>
                </>
              )
            )}
          </span>
        </div>

        {metadata && (
          isYouTubeMetadata(metadata) ? (
            <div className="bg-green-900/50 rounded-md flex p-2 gap-3 items-center text-green-300">
              <img src={metadata.thumbnail_url} alt="Video thumbnail" className="rounded-md" width="40" height="40" />
              <h4 className="font-bold">{metadata.title}</h4>
              <p>Channel: {metadata.channel_name}</p>
            </div>
          ) : (
            <div className="bg-green-900/50 rounded-md flex p-2 gap-3 items-center text-green-300">
              <img src={metadata.favicon} alt="Website favicon" className="rounded-md" width="40" height="40" />
              <h4 className="font-bold">{metadata.title}</h4>
            </div>
          )
        )}
        {error && <p className="text-red-500">{error}</p>}
        <button className="bg-gray-800 w-min flex items-center gap-1 text-xl p-2 px-3 rounded-full">
          Summarize
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
