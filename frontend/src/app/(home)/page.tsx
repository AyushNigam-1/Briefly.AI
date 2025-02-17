"use client"
import React, { useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Image from 'next/image'
import Cookies from "js-cookie";
import axios, { AxiosError } from "axios";
import { ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react'
import clsx from 'clsx'
import { metadata, PromptResponse } from '../types';
import Link from 'next/link';
import { useEffect } from "react";
import { Combobox, ComboboxInput } from '@headlessui/react'
import { languagesList } from '@/app/languages';
import pdfThumbnail from 'pdf-thumbnail';

const page = () => {

  const [selected, setSelected] = useState<string | null>("")
  const [action, setAction] = useState('Summarize')
  const [language, setLanguage] = useState('Hindi')
  const [openComboBox, setOpenComboBox] = useState(false)
  const actions = useMemo(() => ["Summarize", "Extend", "Shorten", "Key Points"], [])
  const languages = useMemo(() => ['Hindi', 'English', 'Urdu', 'Sanskrit'], [])
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<metadata | null>(null)
  const [file, setFile] = useState<File | undefined>()
  const [prompt, setPrompt] = useState<string | undefined>()
  const doc = useRef<HTMLInputElement | null>(null);
  const promptInput = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('')

  const filteredLanguages =
    (query === '')
      ? languagesList
      : languagesList.filter((language) => {
        return language.toLowerCase().includes(query.toLowerCase())
      })

  function isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  const getPrompt = async () => {
    const token = Cookies.get("access_token");
    if (token) {
      try {
        const response = await axios.get<PromptResponse>(`http://127.0.0.1:8000/get-prompt`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true,
        });
        setPrompt(response.data.prompt);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<PromptResponse>;
          console.error('Error fetching prompts:', axiosError.response?.data || axiosError.message);
          return { error: axiosError.response?.data?.error || axiosError.message };
        } else {
          console.error('An unexpected error occurred:', error);
          return { error: 'An unexpected error occurred' };
        }
      }
    }
  };

  const streamToBlob = (stream: ReadableStream<Uint8Array>): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(new Blob(chunks));
          } else {
            chunks.push(value);
            read();
          }
        }).catch(reject);
      }

      read();
    });
  };
  const fileToBuffer = (file: File): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(Buffer.from(reader.result as ArrayBuffer));
        } else {
          reject(new Error('Failed to read file.'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    if (e.target.files) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile)
      const metadata = uploadedFile.size >= 1048576 ? (uploadedFile.size / 1048576).toFixed(2) + ' MB' : (uploadedFile.size / 1024).toFixed(2) + ' KB';
      const fileType = uploadedFile.type.startsWith('image/') ? 'image' : 'document';
      let icon;
      if (fileType === 'image') {
        icon = URL.createObjectURL(uploadedFile);
      }
      else if (uploadedFile.type === 'application/pdf') {
        try {
          const buffer = await fileToBuffer(uploadedFile); // Convert the file to a buffer
          const stream = await pdfThumbnail(buffer); // Generate thumbnail (ReadableStream)
          // Convert ReadableStream to Blob
          const thumbnailBlob = await streamToBlob(stream as unknown as ReadableStream<Uint8Array>);
          icon = URL.createObjectURL(thumbnailBlob);
        } catch (error) {
          console.error('Error generating PDF thumbnail:', error);
          // Fallback to default if thumbnail generation fails
          icon = 'https://img.icons8.com/color/50/google-docs.png';
        }
      }
      else {
        icon = 'https://img.icons8.com/color/50/google-docs.png'; // Default for other document types
      }
      const fileMetaData = { title: uploadedFile.name, metadata, icon, preview: false, type: 'file' };
      setUrl(fileMetaData.title)
      setMetadata(fileMetaData)
    }
    setLoading(false);
  }

  const getMetadata = async () => {
    if (metadata?.type == 'file') {
      setMetadata((metadata) => metadata ? { ...metadata, preview: true } : null)
      setUrl(metadata.icon)
      return
    }
    if (typeof url == 'string' && isValidUrl(url)) {
      setLoading(true);
      try {
        const token = Cookies.get("access_token");
        console.log("Token from cookies:", token);
        const response = await axios.get(`http://127.0.0.1:8000/metadata?url=${encodeURIComponent(url)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true,
        });

        const data = response.data;
        setMetadata({ ...data, preview: true })
        console.log(data)
        // setError(null);
      } catch (err: any) {
        setMetadata(null);

        if (err.response) {
          if (err.response.status === 404) {
            // setError("We couldn't find any metadata for this URL. Please check if the URL is correct.");
          } else if (err.response.status >= 500) {
            // setError("Server encountered an issue. Please try again later.");
          } else {
            // setError("An unexpected error occurred. Please try again.");
          }
        } else {
          // setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // setError(null);
      setMetadata(null);
    }
  };

  const updatePrompt = async (newPrompt: string | undefined) => {
    if (newPrompt != prompt) {
      const token = Cookies.get("access_token");
      try {
        const response = await axios.post<PromptResponse>(`http://127.0.0.1:8000/update-prompt`, {
          new_prompt: newPrompt,
        }, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true,
        });
        setPrompt(response.data.prompt)
        console.log(response)
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<PromptResponse>;
          console.error('Error updating prompt:', axiosError.response?.data || axiosError.message);
          return { error: axiosError.response?.data?.error || axiosError.message };
        } else {
          console.error('An unexpected error occurred:', error);
          return { error: 'An unexpected error occurred' };
        }
      }
    }
    setOpen(false)
    // console.log(newPrompt)
  };
  useEffect(() => {
    getPrompt()
  }, [])
  return (
    <>
      <Navbar />
      <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono'>
        <div className='flex flex-col gap-7'>
          <div className='flex flex-col gap-3'>
            <h3 className='font-black  text-5xl text-[rgba(206, 203, 203, 1)]'>
              Summarize, Understand, Save Time!
            </h3>
            <h6 className='font-medium text-[rgba(206, 203, 203, 1)'>
              Summarize PDFs, text, images with text, YouTube videos, and website links. Save time and get concise insights instantly!
            </h6>
          </div>
          <div className='flex gap-4 w-full' >
            <span className='bg-gray-700 rounded-full flex gap-3 w-full'>
              <button className='bg-gray-900 rounded-full p-3 px-4 flex items-center justify-center' onClick={() => doc.current?.click()}>
                <input type="file" className="hidden" onChange={(e) => handleFileChange(e)} accept=".pdf,.txt,image/*" ref={doc as React.LegacyRef<HTMLInputElement>} />

                <img width="20" height="20" src="https://img.icons8.com/forma-regular/50/FFFFFF/attach.png" alt="attach" />
              </button>
              <input type="text" onChange={({ target }) => setUrl(target.value)} value={url ?? ''} placeholder='e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/' className='appearance-none border-none outline-none bg-transparent p-0 m-0 w-full h-14' />
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
            <button onClick={() => getMetadata()} className="bg-gradient-to-t from-red-500  to-blue-500 rounded-full p-1 flex items-center justify-center">
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
            <button className={` ${action == 'Custom' ? 'bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' : ''}`} onClick={() => { setOpen(true); setAction('Custom') }}>
              <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
                Custom
              </span>
            </button>
            <Dialog open={open} as="div" className="relative z-10 focus:outline-none" onClose={() => setOpen(false)}>
              <DialogBackdrop className="fixed inset-0 bg-black/50" />
              <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <DialogPanel
                    transition
                    className="w-full max-w-md rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
                  >
                    <div className='flex justify-between items-center w-full' >
                      <h6 className='font-mulish text-2xl font-bold' > Custom Prompt </h6>
                      <div className='flex gap-2' >
                        <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' onClick={() => updatePrompt(promptInput.current?.value)} >
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
                    <Textarea placeholder='Write Your Custom Prompt'
                      ref={promptInput}
                      defaultValue={prompt}
                      className={clsx(
                        'block w-full resize-none rounded-lg border-none bg-gray-900 py-1.5 px-3 text-xl text-white',
                        'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
                      )}
                      rows={9}
                    />
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
            <button onClick={() => setOpenComboBox(true)} className='bg-gray-900 p-3 px-4 text-xl rounded-full flex items-center justify-center'>
              Other
            </button>
          </div>

          <Dialog open={!!(metadata && metadata.preview)} as="div" className="relative z-10 focus:outline-none" onClose={() => { setMetadata(null); setUrl(null) }}>
            <DialogBackdrop className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <DialogPanel
                  transition
                  className="w-full max-w-lg rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
                >
                  <div className='flex justify-between items-center' >
                    <h6 className='font-mulish text-2xl font-bold' > Content </h6>
                    <div className='flex gap-2' >
                      <Link
                        href={`/summarize/${encodeURIComponent(url ? url : "")}?title=${metadata?.title}&language=${language}&format=${action}&icon=${metadata?.icon}`}
                      >
                        <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' >
                          <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </span>
                        </button>
                      </Link>
                      <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={() => setMetadata(null)} >
                        <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-md flex p-2 gap-3 items-center">
                    <img
                      src={metadata?.icon}
                      alt="Video thumbnail"
                      className="rounded-md"
                      width="80"
                      height="80"
                    />
                    <div className="flex flex-col gap-1 truncate">
                      <h4 className="font-extrabold font-mulish text-xl truncate">
                        {metadata?.title}
                      </h4>
                      <p className="text-sm font-semibold truncate">{metadata?.metadata}</p>
                    </div>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </Dialog >
          <Dialog open={openComboBox} as="div" className="relative z-10 focus:outline-none" onClose={() => setOpenComboBox(false)}>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <DialogPanel
                transition
                className="w-full max-w-lg h-96 rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h6 className="font-mulish text-2xl font-bold">Choose Language</h6>
                    <div className="flex gap-2">
                      <button className="bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full" onClick={() => { if (selected) { languages.push(selected); setLanguage(selected) }; setOpenComboBox(false) }}>
                        <span className="bg-gray-900 p-2 text-xl rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                      </button>
                      <button className="bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full" onClick={() => setOpenComboBox(false)}>
                        <span className="bg-gray-900 p-2 text-xl rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>

                  <Combobox value={selected} onChange={(value) => setSelected(value)} onClose={() => setQuery('')}>
                    <div className="relative">
                      <ComboboxInput
                        className={clsx(
                          'w-full rounded-lg border-none bg-gray-900  p-3 text-sm/6 text-white',
                          'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
                        )}
                        placeholder='Select Language'
                        displayValue={(language: string) => language}
                        onChange={(event) => { setQuery(event.target.value) }}
                      />
                    </div>
                    <ComboboxOptions className="overflow-y-auto max-h-52 flex flex-col gap-2 scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin" >
                      {filteredLanguages.map((language, i) => (
                        <ComboboxOption
                          key={i}
                          value={language}
                          className="cursor-pointer group flex  bg-gray-500/50 items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
                        >
                          <p className="text-sm/6 text-white">{language}</p>
                        </ComboboxOption>
                      ))}
                    </ComboboxOptions>
                  </Combobox>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        </div >
      </div >
    </>

  )
}

export default page









// "use client"
// import React, { useMemo, useRef, useState } from 'react'
// import Navbar from '../components/Navbar'
// import Image from 'next/image'
// import Cookies from "js-cookie";
// import axios, { AxiosError } from "axios";
// import { ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react'
// import clsx from 'clsx'
// import { metadata, PromptResponse } from '../types';
// import Link from 'next/link';
// import { useEffect } from "react";
// import { Combobox, ComboboxInput } from '@headlessui/react'
// import { languagesList } from '@/app/languages';
// import pdfThumbnail from 'pdf-thumbnail';

// const page = () => {

//   const [selected, setSelected] = useState<string | null>("")
//   const [action, setAction] = useState('Summarize')
//   const [language, setLanguage] = useState('Hindi')
//   const [openComboBox, setOpenComboBox] = useState(false)
//   const actions = useMemo(() => ["Summarize", "Extend", "Shorten", "Key Points"], [])
//   const languages = useMemo(() => ['Hindi', 'English', 'Urdu', 'Sanskrit'], [])
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false)
//   const [url, setUrl] = useState<string | null>(null)
//   const [metadata, setMetadata] = useState<metadata | null>(null)
//   const [file, setFile] = useState<File | undefined>()
//   const [prompt, setPrompt] = useState<string | undefined>()
//   const doc = useRef<HTMLInputElement | null>(null);
//   const promptInput = useRef<HTMLInputElement | null>(null);
//   const [query, setQuery] = useState('')

//   const filteredLanguages =
//     (query === '')
//       ? languagesList
//       : languagesList.filter((language) => {
//         return language.toLowerCase().includes(query.toLowerCase())
//       })

//   function isValidUrl(urlString: string): boolean {
//     try {
//       new URL(urlString);
//       return true;
//     } catch {
//       return false;
//     }
//   }

//   const getPrompt = async () => {
//     const token = Cookies.get("access_token");
//     if (token) {
//       try {
//         const response = await axios.get<PromptResponse>(`http://127.0.0.1:8000/get-prompt`, {
//           headers: {
//             "Authorization": `Bearer ${token}`,
//           },
//           withCredentials: true,
//         });
//         setPrompt(response.data.prompt);
//       } catch (error: unknown) {
//         if (axios.isAxiosError(error)) {
//           const axiosError = error as AxiosError<PromptResponse>;
//           console.error('Error fetching prompts:', axiosError.response?.data || axiosError.message);
//           return { error: axiosError.response?.data?.error || axiosError.message };
//         } else {
//           console.error('An unexpected error occurred:', error);
//           return { error: 'An unexpected error occurred' };
//         }
//       }
//     }
//   };
//   const fileToBuffer = (file: File): Promise<Buffer> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         if (reader.result) {
//           resolve(Buffer.from(reader.result as ArrayBuffer));
//         } else {
//           reject(new Error('Failed to read file.'));
//         }
//       };
//       reader.onerror = reject;
//       reader.readAsArrayBuffer(file);
//     });
//   };
//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     setLoading(true);
//     if (e.target.files) {
//       const uploadedFile = e.target.files[0];
//       setFile(uploadedFile);

//       const metadata = uploadedFile.size >= 1048576 ? (uploadedFile.size / 1048576).toFixed(2) + ' MB' : (uploadedFile.size / 1024).toFixed(2) + ' KB';
//       const fileType = uploadedFile.type.startsWith('image/') ? 'image' : 'document';
//       let icon;

//       if (fileType === 'image') {
//         icon = URL.createObjectURL(uploadedFile);
//       } else if (uploadedFile.type === 'application/pdf') {
//         try {
//           const buffer = await fileToBuffer(uploadedFile); // Convert the file to a buffer
//           const stream = await pdfThumbnail(buffer); // Generate thumbnail (ReadableStream)
//           // Convert ReadableStream to Blob
//           const thumbnailBlob = await streamToBlob(stream as unknown as ReadableStream<Uint8Array>);
//           icon = URL.createObjectURL(thumbnailBlob);
//         } catch (error) {
//           console.error('Error generating PDF thumbnail:', error);
//           // Fallback to default if thumbnail generation fails
//           icon = 'https://img.icons8.com/color/50/google-docs.png';
//         }
//       } else {
//         icon = 'https://img.icons8.com/color/50/google-docs.png'; // Default for other document types
//       }

//       const fileMetaData = { title: uploadedFile.name, metadata, icon, preview: false, type: 'file' };
//       setUrl(fileMetaData.title);
//       setMetadata(fileMetaData);
//     }
//     setLoading(false);
//   };
//   const streamToBlob = (stream: ReadableStream<Uint8Array>): Promise<Blob> => {
//     return new Promise((resolve, reject) => {
//       const chunks: Uint8Array[] = [];
//       const reader = stream.getReader();

//       function read() {
//         reader.read().then(({ done, value }) => {
//           if (done) {
//             resolve(new Blob(chunks));
//           } else {
//             chunks.push(value);
//             read();
//           }
//         }).catch(reject);
//       }

//       read();
//     });
//   };
//   const getMetadata = async () => {
//     if (metadata?.type == 'file') {
//       setMetadata((metadata) => metadata ? { ...metadata, preview: true } : null)
//       setUrl(metadata.icon)
//       return
//     }
//     if (typeof url == 'string' && isValidUrl(url)) {
//       setLoading(true);
//       try {
//         const token = Cookies.get("access_token");
//         console.log("Token from cookies:", token);
//         const response = await axios.get(`http://127.0.0.1:8000/metadata?url=${encodeURIComponent(url)}`, {
//           headers: {
//             "Authorization": `Bearer ${token}`,
//           },
//           withCredentials: true,
//         });

//         const data = response.data;
//         setMetadata({ ...data, preview: true })
//         console.log(data)
//         // setError(null);
//       } catch (err: any) {
//         setMetadata(null);

//         if (err.response) {
//           if (err.response.status === 404) {
//             // setError("We couldn't find any metadata for this URL. Please check if the URL is correct.");
//           } else if (err.response.status >= 500) {
//             // setError("Server encountered an issue. Please try again later.");
//           } else {
//             // setError("An unexpected error occurred. Please try again.");
//           }
//         } else {
//           // setError(err.message);
//         }
//       } finally {
//         setLoading(false);
//       }
//     } else {
//       // setError(null);
//       setMetadata(null);
//     }
//   };

//   const updatePrompt = async (newPrompt: string | undefined) => {
//     if (newPrompt != prompt) {
//       const token = Cookies.get("access_token");
//       try {
//         const response = await axios.post<PromptResponse>(`http://127.0.0.1:8000/update-prompt`, {
//           new_prompt: newPrompt,
//         }, {
//           headers: {
//             "Authorization": `Bearer ${token}`,
//           },
//           withCredentials: true,
//         });
//         setPrompt(response.data.prompt)
//         console.log(response)
//       } catch (error: unknown) {
//         if (axios.isAxiosError(error)) {
//           const axiosError = error as AxiosError<PromptResponse>;
//           console.error('Error updating prompt:', axiosError.response?.data || axiosError.message);
//           return { error: axiosError.response?.data?.error || axiosError.message };
//         } else {
//           console.error('An unexpected error occurred:', error);
//           return { error: 'An unexpected error occurred' };
//         }
//       }
//     }
//     setOpen(false)
//     // console.log(newPrompt)
//   };
//   useEffect(() => {
//     getPrompt()
//   }, [])
//   return (
//     <>
//       <Navbar />
//       <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono'>
//         <div className='flex flex-col gap-7'>
//           <div className='flex flex-col gap-3'>
//             <h3 className='font-black  text-5xl text-[rgba(206, 203, 203, 1)]'>
//               Summarize, Understand, Save Time!
//             </h3>
//             <h6 className='font-medium text-[rgba(206, 203, 203, 1)'>
//               Summarize PDFs, text, images with text, YouTube videos, and website links. Save time and get concise insights instantly!
//             </h6>
//           </div>
//           <div className='flex gap-4 w-full' >
//             <span className='bg-gray-700 rounded-full flex gap-3 w-full'>
//               <button className='bg-gray-900 rounded-full p-3 px-4 flex items-center justify-center' onClick={() => doc.current?.click()}>
//                 <input type="file" className="hidden" onChange={(e) => handleFileChange(e)} accept=".pdf,.txt,image/*" ref={doc as React.LegacyRef<HTMLInputElement>} />

//                 <img width="20" height="20" src="https://img.icons8.com/forma-regular/50/FFFFFF/attach.png" alt="attach" />
//               </button>
//               <input type="text" onChange={({ target }) => setUrl(target.value)} value={url ?? ''} placeholder='e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/' className='appearance-none border-none outline-none bg-transparent p-0 m-0 w-full h-14' />
//               <span className="px-4  bg-gray-700/50 rounded-e-full flex gap-1.5 items-center justify-center text-gray-400">
//                 {loading ? (<>
//                   <Image src="/805.svg" alt="loader" width="20" height="20" />
//                 </>) : (
//                   metadata && (
//                     <>
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
//                       </svg>
//                     </>
//                   )
//                 )}
//               </span>
//             </span>
//             <button onClick={() => getMetadata()} className="bg-gradient-to-t from-red-500  to-blue-500 rounded-full p-1 flex items-center justify-center">
//               <div className="bg-gray-900 rounded-full p-4 flex items-center justify-center">
//                 <img
//                   width="20"
//                   height="20"
//                   src="https://img.icons8.com/ios-filled/50/FFFFFF/sort-right.png"
//                   alt="sort-right"
//                 />
//               </div>
//             </button>
//           </div>
//           <h6 className='font-mulish font-bold' > WHAT TO DO ? </h6>
//           <div className='flex gap-3'>
//             {
//               actions.map(e => <button key={e} onClick={() => setAction(e)} className={` ${action == e ? 'bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' : ''}`}>
//                 <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
//                   {e}
//                 </span>
//               </button>
//               )
//             }
//             <button className={` ${action == 'Custom' ? 'bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' : ''}`} onClick={() => { setOpen(true); setAction('Custom') }}>
//               <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
//                 Custom
//               </span>
//             </button>
//             <Dialog open={open} as="div" className="relative z-10 focus:outline-none" onClose={() => setOpen(false)}>
//               <DialogBackdrop className="fixed inset-0 bg-black/50" />
//               <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
//                 <div className="flex min-h-full items-center justify-center p-4">
//                   <DialogPanel
//                     transition
//                     className="w-full max-w-md rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
//                   >
//                     <div className='flex justify-between items-center w-full' >
//                       <h6 className='font-mulish text-2xl font-bold' > Custom Prompt </h6>
//                       <div className='flex gap-2' >
//                         <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' onClick={() => updatePrompt(promptInput.current?.value)} >
//                           <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
//                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                               <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
//                             </svg>
//                           </span>
//                         </button>
//                         <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={() => setOpen(false)} >
//                           <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
//                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
//                             </svg>
//                           </span>
//                         </button>
//                       </div>
//                     </div>
//                     <Textarea placeholder='Write Your Custom Prompt'
//                       ref={promptInput}
//                       defaultValue={prompt}
//                       className={clsx(
//                         'block w-full resize-none rounded-lg border-none bg-gray-900 py-1.5 px-3 text-xl text-white',
//                         'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
//                       )}
//                       rows={9}
//                     />
//                   </DialogPanel>
//                 </div>
//               </div>
//             </Dialog>
//           </div>
//           <h6 className='font-mulish font-bold' > CHOOSE LANUAGE ? </h6>
//           <div className='flex gap-3'>
//             {
//               languages.map(e => <button key={e} onClick={() => setLanguage(e)} className={` ${language == e ? 'bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' : ''}`}> <span className='bg-gray-900 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
//                 {e}
//               </span>
//               </button>
//               )
//             }
//             <button onClick={() => setOpenComboBox(true)} className='bg-gray-900 p-3 px-4 text-xl rounded-full flex items-center justify-center'>
//               Other
//             </button>
//           </div>

//           <Dialog open={!!(metadata && metadata.preview)} as="div" className="relative z-10 focus:outline-none" onClose={() => { setMetadata(null); setUrl(null) }}>
//             <DialogBackdrop className="fixed inset-0 bg-black/50" />
//             <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
//               <div className="flex min-h-full items-center justify-center p-4">
//                 <DialogPanel
//                   transition
//                   className="w-full max-w-lg rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
//                 >
//                   <div className='flex justify-between items-center' >
//                     <h6 className='font-mulish text-2xl font-bold' > Content </h6>
//                     <div className='flex gap-2' >
//                       <Link
//                         href={`/summarize/${encodeURIComponent(url ? url : "")}?title=${metadata?.title}&language=${language}&format=${action}&icon=${metadata?.icon}`}
//                       >
//                         <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full' >
//                           <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
//                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                               <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
//                             </svg>
//                           </span>
//                         </button>
//                       </Link>
//                       <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={() => setMetadata(null)} >
//                         <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
//                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                             <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
//                           </svg>
//                         </span>
//                       </button>
//                     </div>
//                   </div>
//                   <div className="bg-gray-900 rounded-md flex p-2 gap-3 items-center">
//                     <img
//                       src={metadata?.icon}
//                       alt="Video thumbnail"
//                       className="rounded-md"
//                       width="80"
//                       height="80"
//                     />
//                     <div className="flex flex-col gap-1 truncate">
//                       <h4 className="font-extrabold font-mulish text-xl truncate">
//                         {metadata?.title}
//                       </h4>
//                       <p className="text-sm font-semibold truncate">{metadata?.metadata}</p>
//                     </div>
//                   </div>
//                 </DialogPanel>
//               </div>
//             </div>
//           </Dialog >
//           <Dialog open={openComboBox} as="div" className="relative z-10 focus:outline-none" onClose={() => setOpenComboBox(false)}>
//             <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
//               <DialogPanel
//                 transition
//                 className="w-full max-w-lg h-96 rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
//               >
//                 <div className="flex flex-col gap-3">
//                   <div className="flex justify-between items-center">
//                     <h6 className="font-mulish text-2xl font-bold">Choose Language</h6>
//                     <div className="flex gap-2">
//                       <button className="bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full" onClick={() => { if (selected) { languages.push(selected); setLanguage(selected) }; setOpenComboBox(false) }}>
//                         <span className="bg-gray-900 p-2 text-xl rounded-full flex items-center justify-center">
//                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                             <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
//                           </svg>
//                         </span>
//                       </button>
//                       <button className="bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full" onClick={() => setOpenComboBox(false)}>
//                         <span className="bg-gray-900 p-2 text-xl rounded-full flex items-center justify-center">
//                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
//                             <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
//                           </svg>
//                         </span>
//                       </button>
//                     </div>
//                   </div>

//                   <Combobox value={selected} onChange={(value) => setSelected(value)} onClose={() => setQuery('')}>
//                     <div className="relative">
//                       <ComboboxInput
//                         className={clsx(
//                           'w-full rounded-lg border-none bg-gray-900  p-3 text-sm/6 text-white',
//                           'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
//                         )}
//                         placeholder='Select Language'
//                         displayValue={(language: string) => language}
//                         onChange={(event) => { setQuery(event.target.value) }}
//                       />
//                     </div>
//                     <ComboboxOptions className="overflow-y-auto max-h-52 flex flex-col gap-2 scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin" >
//                       {filteredLanguages.map((language, i) => (
//                         <ComboboxOption
//                           key={i}
//                           value={language}
//                           className="cursor-pointer group flex  bg-gray-500/50 items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
//                         >
//                           <p className="text-sm/6 text-white">{language}</p>
//                         </ComboboxOption>
//                       ))}
//                     </ComboboxOptions>
//                   </Combobox>
//                 </div>
//               </DialogPanel>
//             </div>
//           </Dialog>
//         </div >
//       </div >
//     </>

//   )
// }

// export default page