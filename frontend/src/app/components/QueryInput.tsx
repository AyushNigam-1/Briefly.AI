import { KeyboardEvent, useRef, useState } from "react";
import { QueryInputProps } from "@/app/types";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import Link from "next/link";
import Loader from "./Loader";
import { Sparkle, Sparkles } from "lucide-react";

const QueryInput = ({ setQueries, url, setState, id, ytRecommendations, webRecommendations, isloading, cancelRecommendations, fetchRecommendations }: QueryInputProps) => {
    const [showDisclosure, setShowDisclosure] = useState(true);



    const fetchQueryResult = async (query: string) => {
        const response = await fetch("http://localhost:8000/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, id }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        return response.json();
    };

    return (
        <div>
            {/* <div className="container my-2 mx-auto w-full" > */}
            {/* {showDisclosure && (
                <Disclosure as="div" className="container p-2 mx-auto w-full bg-gray-900 rounded-md border-2 border-gray-700 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <DisclosureButton className="text-gray-300 text-left text-lg font-semibold flex gap-2 items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                            </svg>
                            Recommendations
                        </DisclosureButton>
                        <button onClick={() => setShowDisclosure(false)} className="text-gray-400 hover:text-red-500">
                            Remove
                        </button>
                    </div>

                    {isloading ? (
                        <DisclosurePanel className="text-gray-500 flex flex-col gap-2 ">
                            <div className="flex justify-center items-center h-60 flex-col gap-4">
                                <Loader />
                                <button onClick={cancelRecommendations} className="text-gray-400 p-2 rounded-lg flex items-center gap-2 border border-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                            </div>
                        </DisclosurePanel>
                    ) : (
                        <DisclosurePanel className="text-gray-500 flex flex-col gap-2 ">
                            {!(Array.isArray(ytRecommendations) && ytRecommendations.length > 0 && Array.isArray(webRecommendations) && webRecommendations.length > 0) ? (
                                <div className="flex justify-center items-center h-60 flex-col gap-4 flex-wrap">
                                    <span className="text-gray-400 text-lg">No recommendations found </span>
                                    <button onClick={() => id && fetchRecommendations(id)} className="text-gray-400 p-2 rounded-lg flex items-center gap-2 border border-gray-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="bg-gray-600 h-0.5 w-full"></span>
                                    <h5 className="text-lg text-gray-400">Youtube Videos</h5>
                                    <div className="flex gap-2 flex-wrap">
                                        {ytRecommendations?.map((recommendation, index) => (
                                            <Link key={index} href={recommendation.link}>
                                                <div className="bg-gray-900 w-max rounded-lg flex p-2 py-2 gap-2 border-2 border-gray-500 items-center">
                                                    <img width="50" height="50" src={recommendation.thumbnail} alt="youtube-play--v1" />
                                                    <span>
                                                        <h4 className="truncate text-lg font-bold text-gray-200 line-clamp-1 w-52">{recommendation?.title}</h4>
                                                        <h6 className="text-gray-400 font-semibold rounded-xl flex items-center gap-1">{recommendation?.channel_name}</h6>
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <h5 className="text-lg text-gray-400">Websites</h5>
                                    <div className="flex gap-2 flex-wrap">
                                        {webRecommendations?.map((recommendation, index) => (
                                            <Link key={index} href={recommendation.link} passHref>
                                                <div className="bg-gray-900 w-max rounded-lg flex p-2 gap-2 border-2 border-gray-500 items-center">
                                                    <img width="50" height="50" src={recommendation?.icon} className="rounded-md" alt="globe" />
                                                    <span>
                                                        <h4 className="m-0 truncate text-lg font-bold text-gray-200 line-clamp-1 w-52">{recommendation?.title}</h4>
                                                        <h6 className="text-gray-400 font-semibold rounded-xl flex items-center gap-1">{recommendation?.website_name}</h6>
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            )}
                        </DisclosurePanel>
                    )}
                </Disclosure>
            )} */}
            {/* </div> */}

        </div>
    );
};

export default QueryInput;
