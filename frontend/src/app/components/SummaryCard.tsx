import Link from "next/link";
import { useEffect, useState } from "react";
const SummaryCard = ({ summary, setIsDialogOpen, setSummaryId, previewUrl, markSummaryAsFavorite, favourites }: any) => {

    function formatRelativeDate(timestamp: string): string {
        const date = new Date(timestamp);
        const now = new Date();

        const differenceInMilliseconds = now.getTime() - date.getTime();
        const differenceInDays = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
        const differenceInMonths = Math.floor(differenceInDays / 30);
        const differenceInYears = Math.floor(differenceInDays / 365);

        if (differenceInDays < 30) {
            return `${differenceInDays} day${differenceInDays !== 1 ? 's' : ''} ago`;
        } else if (differenceInDays < 365) {
            return `${differenceInMonths} month${differenceInMonths !== 1 ? 's' : ''} ago`;
        } else {
            return `${differenceInYears} year${differenceInYears !== 1 ? 's' : ''} ago`;
        }
    }


    return (

        <div className='bg-gray-900 w-full rounded-lg flex justify-between items-center  gap-2 m-1 transition-all delay-100 '>
            <div className='flex flex-col gap-2 w-full' >
                <div className="w-full" >

                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className='m-0 object-cover h-48 w-full rounded-t-lg'
                        />
                    ) : (
                        <div className='m-0 h-48 rounded-t-lg bg-gray-700' />
                    )}
                </div>
                <span className='flex flex-col h-full justify-between p-2 gap-2'>
                    <h4 className='m-0 text-lg font-bold text-gray-100 line-clamp-2 min-h-14'>
                        <Link href={`/summarize/${encodeURIComponent(summary.url)}?id=${summary.id}`} className="hover:underline" >
                            {summary.title}
                        </Link>
                    </h4>
                    <div className='flex justify-between items-center mt-auto'>
                        <div className="flex gap-3">
                            <h6 className='text-gray-300 font-bold w-min py-1 p-1 rounded-xl flex items-center gap-1'>
                                {
                                    summary.type == 'Video' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg> : summary.type == 'Image' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                }
                                {summary.type}
                            </h6>
                            <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-1 items-center'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                                </svg>

                                {summary.queries}
                            </span>
                            <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-1 items-center text-nowrap'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                {formatRelativeDate(summary.timestamp)}
                            </span>
                        </div>
                        <div className="flex gap-2" >
                            <button onClick={() => markSummaryAsFavorite(summary.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill={favourites.includes(summary.id) ? "red" : "none"} viewBox="0 0 24 24" className={`size-5 hover:text-white stroke-white stroke-2  ${favourites.includes(summary.id) && 'fill-red-500 stroke-0'}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                </svg>

                            </button>
                            <button onClick={(event) => {
                                event.stopPropagation(); setIsDialogOpen(true); setSummaryId(summary.id)
                            }} ><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 hover:text-red-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </span>
            </div>
            {/* <div className='flex gap-2' >
                    <button onClick={() => { setSummaryId(summary.id); setIsDialogOpen(true) }} className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full'  >
                        <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </span>
                    </button>

                </div> */}
        </div>

    );
};

export default SummaryCard