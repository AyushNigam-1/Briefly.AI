"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { yt_metadata, web_metadata } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "../components/Navbar"
import Cookies from "js-cookie";
import axios from "axios";
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<yt_metadata | web_metadata | null>(null);
  const [url, setUrl] = useState<string | null>()
  const [file, setFile] = useState<FileList | undefined>();
  const doc = useRef<HTMLInputElement | null>(null);
  function isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }
 
  
  const getMetadata = async (url: string) => {
    if (isValidUrl(url)) {
      setLoading(true);
      try {
        // Retrieve the token from cookies
        const token = Cookies.get("access_token"); 
        console.log("Token from cookies:", token);
  
        const response = await axios.get(`http://127.0.0.1:8000/metadata?url=${encodeURIComponent(url)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true, // Ensures cookies are sent with the request
        });
  
        const data = response.data;
        setUrl(url);
        setMetadata(data);
        setError(null);
      } catch (err: any) {
        setMetadata(null);
        setUrl(null);
  
        if (err.response) {
          // Handle specific HTTP errors
          if (err.response.status === 404) {
            setError("We couldn't find any metadata for this URL. Please check if the URL is correct.");
          } else if (err.response.status >= 500) {
            setError("Server encountered an issue. Please try again later.");
          } else {
            setError("An unexpected error occurred. Please try again.");
          }
        } else {
          // Network error or other issues
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setError(null);
      setMetadata(null);
    }
  };
  


  const isYouTubeMetadata = (metadata: yt_metadata | web_metadata): metadata is yt_metadata => {
    return (metadata as yt_metadata).thumbnail_url !== undefined;
  };

  return (
    <div>
      <Navbar />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono">
        <div className="flex flex-col gap-10">
          <h3 className="text-gray-100 font-bold text-4xl">
            Quick Summaries of YouTube Content, Web Pages & Documents
          </h3>
          <div className="flex gap-2">
            <div className="flex w-full">
              <input
                type="text"
                onChange={({ target }) => getMetadata(target.value)}
                className="bg-gray-700/50 py-4 w-full rounded-s-full pl-6 outline-none"
                placeholder="e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/"
              />
              <span className="px-4  bg-gray-700/50 rounded-e-full flex gap-1.5 items-center justify-center text-gray-400">
                {loading ? (<>
                  <Image src="/805.svg" alt="loader" width="20" height="20" />
                </>) : (
                  metadata && (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </>
                  )
                )}
              </span>
            </div>
            <button className="flex bg-gray-700/50 p-2 items-center rounded-full px-4" onClick={() => doc.current?.click()} >
              <input type="file" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files ?? undefined)} ref={doc as React.LegacyRef<HTMLInputElement>} />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>

            </button>
          </div>
          <Link href={`/summary/${encodeURIComponent(url ? url : "")}/${ metadata?.title } `}>
            <div className="p-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full inline-block">
              <button
                className="bg-gray-700 w-min flex items-center gap-1 text-xl p-2 px-3 rounded-full disabled:line-through"
                disabled={!metadata}
              >
                Summarize
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0-3.75 3.75M21 12H3"
                  />
                </svg>
              </button>
            </div>
          </Link>
          <div className="min-h-[100px]">
            <AnimatePresence>
              {metadata && (
                isYouTubeMetadata(metadata) ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="bg-gray-900/70 rounded-md flex p-2 gap-2 items-center text-gray-300">
                      <img src={metadata.thumbnail_url} alt="Video thumbnail" className="rounded-md" width="80" height="80" />
                      <div className="flex flex-col gap-1 truncate">
                        <h4 className="font-bold truncate">{metadata.title}</h4>
                        <p>{metadata.channel_name}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="bg-gray-900/70 rounded-md flex p-2 gap-2 items-center text-gray-300">
                      <img src={metadata.favicon} alt="Website favicon" className="rounded-md" width="40" height="40" />
                      <div className="flex flex-col gap-1">
                        <h4 className="font-bold">{metadata.title}</h4>
                        <p>{metadata.base_url}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
            <AnimatePresence>
              {error && <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              > <div className="bg-red-900/50 rounded-md flex p-2 gap-3 items-center text-red-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p>{error}</p>
                </div>
              </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
