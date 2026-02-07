import { Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react';
import clsx from 'clsx';
import { CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useRef, useState } from 'react'

const ContentDialog = ({ metadata, setMetadata, setUrl, url }: { metadata: any, setMetadata: any, setUrl: any, url: any }) => {
    const actions = useMemo(() => ["Summarize", "Extend", "Shorten", "Key Points"], [])
    const languages = useMemo(() => ['Hindi', 'English', 'Urdu', 'Sanskrit'], [])
    const [action, setAction] = useState('Summarize')
    const [language, setLanguage] = useState('Hindi')
    const promptInput = useRef<HTMLInputElement | null>(null);

    return (
        <div>
            <Dialog open={!!(metadata && metadata.preview)} as="div" className="relative z-10 focus:outline-none" onClose={() => { setMetadata(null); setUrl(null) }}>
                <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center">
                        <DialogPanel
                            transition
                            className="w-full max-w-lg rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-4 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0 font-mono text-white space-y-2"
                        >
                            <div className='flex justify-between items-center' >
                                <h6 className='font-mulish text-2xl font-bold'> Content </h6>
                                <div className='flex gap-2' >

                                    <button className=' text-xl rounded-full  flex items-center justify-center' onClick={() => { setUrl(null); setMetadata(null) }} >
                                        <X />
                                    </button>
                                </div>
                            </div>
                            <hr className='border border-gray-700 ' />
                            <div className="bg-gray-900 rounded-lg flex p-2 gap-2 items-center">
                                <img
                                    src={metadata?.thumbnail}
                                    alt="Video thumbnail"
                                    className="rounded-md max-w-20"

                                />
                                <div className="flex flex-col gap-1 truncate">
                                    <h4 className="font-bold text-lg truncate">
                                        {metadata?.title}
                                    </h4>
                                    <p className="text-sm text-gray-300 truncate">{metadata?.metadata}</p>
                                </div>
                            </div>
                            <h6 className='font-mono font-bold' > Choose Style </h6>
                            <div className='flex gap-3 flex-wrap'>
                                {
                                    actions.map(e => <button key={e} onClick={() => setAction(e)} className={` ${action == e && 'border border-gray-300'} bg-gray-900 p-3 px-4 rounded-lg `}>
                                        {e}
                                    </button>
                                    )
                                }
                                {/* <button className={` ${action == 'Custom' ? 'bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' : ''}`} onClick={() => { setOpen(true); setAction('Custom') }}>
                      <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
                        Custom
                      </span>
                    </button> */}
                            </div>
                            <h6 className='font-mono font-bold' > Choose Language </h6>
                            <div className='flex gap-3 flex-wrap'>
                                {
                                    languages.map(e => <button key={e} onClick={() => setLanguage(e)} className={` ${language == e && 'border border-gray-300'} rounded-lg bg-gray-900 p-3 px-4  `}>
                                        {e}
                                    </button>
                                    )
                                }
                                {/* <button onClick={() => setOpenComboBox(true)} className='bg-gray-900 p-3 px-4 text-xl rounded-full flex items-center justify-center'>
                      Other
                    </button> */}
                            </div>
                            <h6 className='font-mono font-bold' > Custom Prompt </h6>
                            <Textarea placeholder='Write Your Custom Prompt'
                                ref={promptInput}
                                // defaultValue={prompt}
                                className={clsx(
                                    'block w-full resize-none rounded-lg border-none bg-white/5 p-3 text-white',
                                    'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
                                )}
                                rows={6}
                            />
                            <hr className='border border-gray-700 ' />
                            <Link className='flex items-center gap-2 p-3 font-semibold bg-gray-900 rounded-lg justify-center' href={`/summarize/${encodeURIComponent(url ? url : "")}?title=${metadata?.title}&language=${language}&format=${action}&icon=${metadata?.thumbnail}`} >
                                <CheckCircle size={18} /> Confirm
                            </Link>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog >
        </div>
    )
}

export default ContentDialog