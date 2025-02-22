import { KeyboardEvent, useRef, useState } from "react";
import { QueryInputProps } from "@/app/types";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import Link from "next/link";
import Loader from "./Loader";

const QueryInput = ({ setQueries, url, setState, id, ytRecommendations, webRecommendations, isloading }: QueryInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDisclosure, setShowDisclosure] = useState(true);

    console.log(webRecommendations)
    const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && e.currentTarget.value.trim()) {
            setState("pending");
            const inputValue = e.currentTarget.value;
            setQueries((queries) => [...queries, { sender: "user", content: inputValue }]);

            if (inputRef.current) {
                inputRef.current.value = "";
            }

            try {
                const result = await fetchQueryResult(inputValue);
                setQueries((queries) => [
                    ...queries,
                    { sender: "llm", content: result.res, thought: result.thought },
                ]);
            } catch (error) {
                console.error("Error fetching query result:", error);
            } finally {
                setState("completed");
            }
        }
    };

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
            {showDisclosure && (
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
                        <div className="flex justify-center items-center h-60">
                            <Loader />
                        </div>
                    ) : (
                        <DisclosurePanel className="text-gray-500 flex flex-col gap-2">
                            <span className="bg-gray-600 h-0.5 w-full" ></span>
                            <h5 className="text-lg text-gray-400">Youtube Videos</h5>
                            <div className="flex gap-2">
                                {ytRecommendations?.map((recommendation, index) => (
                                    <Link key={index} href={recommendation.link}>
                                        <div className="bg-gray-900 w-max rounded-lg flex p-2 py-2 gap-2 border-2 border-gray-500 items-center">
                                            <img width="50" height="50" src="https://img.icons8.com/ios/50/EBEBEB/youtube-play--v1.png" alt="youtube-play--v1" />
                                            <span>
                                                <h4 className=" truncate text-lg font-bold text-gray-200 line-clamp-1 w-52">
                                                    {recommendation?.title}
                                                </h4>
                                                <h6 className="text-gray-300 font-bold rounded-xl flex items-center gap-1">
                                                    {recommendation?.channel_name}
                                                </h6>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <h5 className="text-lg text-gray-400">Websites</h5>
                            <div className="flex gap-2">
                                {webRecommendations?.map((recommendation, index) => (
                                    <Link key={index} href={recommendation.link} passHref>
                                        <div className="bg-gray-900 w-max rounded-lg flex p-2 gap-2 border-2 border-gray-500 items-center">
                                            <img width="50" height="50" src="https://img.icons8.com/forma-thin/50/EBEBEB/globe.png" alt="globe" />
                                            <span>
                                                <h4 className="m-0 truncate text-lg font-bold text-gray-200 line-clamp-1 w-52">
                                                    {recommendation?.title}
                                                </h4>
                                                <h6 className="text-gray-300 font-bold  rounded-xl flex items-center gap-1">
                                                    {recommendation?.website_name}
                                                </h6>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </DisclosurePanel>
                    )}
                </Disclosure>
            )}
            {/* </div> */}
            <div className="flex container my-2 mx-auto rounded-md border-2 border-gray-700">
                <span className="bg-gray-900 pl-3 rounded-s-md py-4">
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
                            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                        />
                    </svg>
                </span>
                <input
                    type="text"
                    ref={inputRef}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-900 w-full rounded-e-md pl-3 outline-none py-4"
                    placeholder="Ask AI"
                />
            </div>
        </div>
    );
};

export default QueryInput;
