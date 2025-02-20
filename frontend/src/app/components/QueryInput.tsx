import { KeyboardEvent, useRef } from "react";
import { QueryInputProps } from "@/app/types";
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import Link from "next/link";


const QueryInput = ({ setQueries, url, setState, id, ytRecommendations, webRecommendations }: QueryInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {

        if (e.key === "Enter" && e.currentTarget.value.trim()) {

            setState('pending')
            const inputValue = e.currentTarget.value;
            setQueries((queries) => [...queries, { sender: "user", content: inputValue }]);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
            try {
                const result = await fetchQueryResult(inputValue);
                // console.log(result)
                setQueries((queries) => ([...queries, { sender: "llm", content: result.res, thought: result.thought }]));

            } catch (error) {
                console.error("Error fetching query result:", error);
            } finally {
                setState('completed');
            }
        }
        console.log("ended")
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

        const data = await response.json();
        console.log(data)
        return data
    };
    return (
        <div>
            <Disclosure>
                <DisclosureButton className="py-2">Is team pricing available?</DisclosureButton>
                <DisclosurePanel className="text-gray-500 flex flex-col gap-2">
                    <div className="flex gap-2" >

                        {ytRecommendations?.map(recommendation => {
                            return (<Link href={recommendation.link} >
                                <div className='bg-gray-900 w-max rounded-lg flex p-2 gap-2 mt-2 border-2 border-gray-500'>
                                    {/* {metadata?.icon ? (
                                    <img
                                        src={metadata?.icon}
                                        alt="Preview"
                                        className='object-cover m-0 w-20 rounded-lg border-gray-500 border-2'
                                    />
                                ) : (
                                    <div className='m-0 w-20 rounded-lg border-gray-500 border-2 bg-gray-700' />
                                )} */}
                                    <span>
                                        <h4 className='m-0 truncate text-lg font-bold text-gray-200' >{recommendation?.title.split(" ").slice(0, 5).join(" ")}. . .</h4>
                                        <h6 className='text-gray-300 font-bold w-min py-1 p-1 rounded-xl flex items-center gap-1'>
                                            {recommendation?.channel_name}
                                        </h6>
                                    </span>
                                </div>
                            </Link>)
                        })}
                    </div>
                    <div className="flex gap-2" >

                        {webRecommendations?.map(recommendation => {
                            return (<Link href={recommendation.link} >
                                <div className='bg-gray-900 w-max rounded-lg flex p-2 gap-2 mt-2 border-2 border-gray-500'>
                                    {/* {metadata?.icon ? (
                                    <img
                                        src={metadata?.icon}
                                        alt="Preview"
                                        className='object-cover m-0 w-20 rounded-lg border-gray-500 border-2'
                                        />
                                ) : (
                                    <div className='m-0 w-20 rounded-lg border-gray-500 border-2 bg-gray-700' />
                                )} */}
                                    <span>
                                        <h4 className='m-0 truncate text-lg font-bold text-gray-200' >{recommendation?.title.split(" ").slice(0, 5).join(" ")}. . .</h4>
                                        <h6 className='text-gray-300 font-bold w-min py-1 p-1 rounded-xl flex items-center gap-1'>
                                            {recommendation?.website_name}
                                        </h6>
                                    </span>
                                </div>
                            </Link>)
                        })}
                    </div>
                </DisclosurePanel>
            </Disclosure>
            <div className="flex container my-2 mx-auto rounded-md  border-2 border-gray-700" >
                <span className="bg-gray-900 pl-3 rounded-s-md py-4" >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
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
    )
}

export default QueryInput