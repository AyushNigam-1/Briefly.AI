"use client"
import React, { useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Image from 'next/image'
import { Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react'
import clsx from 'clsx'
const page = () => {
  const [action, setAction] = useState('Summarize')
  const [language, setLanguage] = useState('Hindi')
  const actions = useMemo(() => ["Summarize", "Extend", "Shorten", "Key Points"], [])
  const languages = useMemo(() => ['Hindi', 'English', 'Urdu', 'Sanskrit'], [])
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true)
  const [metadata, setMetadata] = useState(null)

  return (
    <>
      <Navbar />
      <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono'>
        <div className='flex flex-col gap-7'>
          <div>
            <h3 className='font-black  text-5xl text-[rgba(206, 203, 203, 1)]'>
              Summarize, Understand, Save Time!
            </h3>
            <h6 className='font-medium  text-sm text-[rgba(206, 203, 203, 1)'>
              Summarize PDFs, text, images with text, YouTube videos, and website links. Save time and get concise insights instantly!
            </h6>
          </div>
          <div className='flex gap-4 w-full' >
            <span className='bg-gray-700 rounded-full flex gap-3 w-full'>
              <button className='bg-gray-900 rounded-full p-3 px-4 flex items-center justify-center'>
                <img width="20" height="20" src="https://img.icons8.com/forma-regular/50/FFFFFF/attach.png" alt="attach" />
              </button>
              <input type="text" placeholder='e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/' className='appearance-none border-none outline-none bg-transparent p-0 m-0 w-full h-14' />
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
            </span>
            <button className="bg-gradient-to-t from-red-500  to-blue-500 rounded-full p-1 flex items-center justify-center">
              <div className="bg-gray-900 rounded-full p-4 flex items-center justify-center">
                <img
                  width="20"
                  height="20"
                  src="https://img.icons8.com/ios-filled/50/FFFFFF/sort-right.png"
                  alt="sort-right"
                />
              </div>
            </button>
          </div>
          <h6 className='font-mulish font-bold' > WHAT TO DO ? </h6>
          <div className='flex gap-3'>
            {
              actions.map(e => <button key={e} onClick={() => setAction(e)} className={` ${action == e ? 'bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' : ''}`}>
                <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
                  {e}
                </span>
              </button>
              )
            }
            <button className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' onClick={() => setOpen(true)}>
              Custom
            </button>
            <Dialog open={open} as="div" className="relative z-10 focus:outline-none" onClose={close}>
              <DialogBackdrop className="fixed inset-0 bg-black/50" />
              <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <DialogPanel
                    transition
                    className="w-full max-w-md rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
                  >
                    <Textarea placeholder='Write Your Custom Prompt'
                      className={clsx(
                        'block w-full resize-none rounded-lg border-none bg-gray-700 py-1.5 px-3 text-xl text-white',
                        'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
                      )}
                      rows={9}
                    />
                    <div className='flex justify-between items-center w-full' >
                      <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={() => setOpen(false)} >
                        <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>

                        </span>
                      </button>
                      <div className='flex gap-2' >
                        <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' >
                          <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </span>
                        </button>
                        <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={() => setOpen(false)} >
                          <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                  </DialogPanel>
                </div>
              </div>
            </Dialog>
          </div>
          <h6 className='font-mulish font-bold' > CHOOSE LANUAGE ? </h6>
          <div className='flex gap-3'>
            {
              languages.map(e => <button key={e} onClick={() => setLanguage(e)} className={` ${language == e ? 'bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' : ''}`}> <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
                {e}
              </span>
              </button>
              )
            }
            <button className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center'>
              Other
            </button>
          </div>
        </div>
      </div>
    </>

  )
}

export default page