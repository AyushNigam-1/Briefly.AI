"use client"
import React, { useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Image from 'next/image'
import Cookies from "js-cookie";
import axios, { AxiosError } from "axios";
import { ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react'
import clsx from 'clsx'
import { metadata, PromptResponse, query } from '../types';
import { useEffect } from "react";
import { Combobox, ComboboxInput } from '@headlessui/react'
import { languagesList } from '@/app/languages';
import { Check, CheckCircle, CircleCheck, Loader2, Paperclip, SendHorizontal, X } from "lucide-react"
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import ContentDialog from '../components/ContentDialog';
import Chats from '../components/Chats';
import { useMutation } from '@tanstack/react-query';
import { useMutations } from '../hooks/useMutations';

const page = () => {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<metadata | null>(null)
  const doc = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([])
  const [Id, setId] = useState<string>()
  const { sendQuery } = useMutations()
  const [queries, setQueries] = useState<query[]>([])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...(prev || []), ...newFiles]);
    }
    e.target.value = '';
  }

  const handleSend = async (query: string) => {
    let activeId = Id;
    if (!activeId) {
      activeId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      const newPath = `${window.location.pathname.replace(/\/$/, '')}/${activeId}`;
      window.history.pushState({ path: newPath }, '', newPath);
      setId(activeId);
    }
    setQueries((prev) => [...(prev || []), { sender: "user", content: query }]);
    const data = await sendQuery.mutateAsync({ query, id: activeId });
    setQueries((prev) => [...(prev || []), { sender: "llm", content: data.res }]);
  };


  return (
    <>
      {/* <Navbar component={<Sidebar />} /> */}
      {
        queries.length ? <Chats queries={queries} setQueries={setQueries} isPending={sendQuery.isPending} handleSend={handleSend} /> : <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono text-white'>
          <div className='flex flex-col gap-10'>
            <div className='flex flex-col gap-3'>
              <h3 className='font-bold text-gray-200 text-5xl text-center font-mono'>
                Summarize, Understand, Save Time!
              </h3>
              <h6 className='font-medium text-gray-300 text-center text-sm'>
                Summarize PDFs, text, images with text, YouTube videos, and website links. Save time and get concise insights instantly!
              </h6>
            </div>
            <div className='flex gap-4 w-full items-end'>
              <span className=' w-full space-y-2 '>
                {
                  files.length != 0 && <span className='flex gap-2  overflow-x-auto items-center'>
                    {files?.map((file) => <>
                      <div className='p-2 flex gap-2 bg-white/5 rounded-xl items-center'>
                        <span className='p-3 rounded-full bg-white/5'>
                          <Paperclip size="16" />
                        </span>
                        <div className=''>
                          <h1 className='font-semibold'>
                            {file.name.slice(0, 12)}...
                          </h1>
                          <p className='text-sm'>
                            {file.size >= 1048576
                              ? (file.size / 1048576).toFixed(2) + ' MB'
                              : (file.size / 1024).toFixed(2) + ' KB'}
                          </p>
                        </div>
                      </div>
                    </>)}
                  </span>
                }
                <div className='flex gap-2 bg-white/5  rounded-full'>
                  <button className='bg-gray-900 rounded-full p-4 flex items-center justify-center' onClick={() => doc.current?.click()}>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e)} accept=".pdf,.txt,image/*,video/*" ref={doc as React.LegacyRef<HTMLInputElement>} multiple />
                    <Paperclip size="20" />
                  </button>
                  <input type="text" onChange={({ target }) => setUrl(target.value)} value={url ?? ''} placeholder='Ask AI' className='appearance-none border-none outline-none bg-transparent p-2 w-full h-14' />
                </div>
              </span>
              <button onClick={() => url && handleSend(url)} className=" rounded-full bg-gray-900 flex items-center justify-center">
                <div className=" rounded-full p-4 flex items-center justify-center">
                  {loading ? <Loader2 className='animate-spin' size="20" /> : <SendHorizontal size="20" />}
                </div>
              </button>
            </div>
            <ContentDialog metadata={metadata} setMetadata={setMetadata} setUrl={setUrl} url={url} />
          </div >
        </div >
      }
    </>
  )
}

export default page