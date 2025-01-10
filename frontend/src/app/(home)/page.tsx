"use client"
import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Navbar from '../components/Navbar'
const page = () => {
  const [action, setAction] = useState('Summarize')
  const [language, setLanguage] = useState('Hindi')
  const actions = useMemo(() => ["Summarize", "Extend", "Shorten", "Key Points"], [])
  const languages = useMemo(() => ['Hindi', 'English', 'Urdu', 'Sanskrit'], [])

  return (
    <>
    <Navbar/>
    <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono'>
      <div className='flex flex-col gap-7'>
        <div>
          <h3 className='font-black  text-5xl text-[rgba(206, 203, 203, 1)]'>
            Summarize, Understand, Save Time!
          </h3>
          {/* <h6 className='font-medium  text-sm text-[rgba(206, 203, 203, 1)'>
            Summarize PDFs, text, images with text, YouTube videos, and website links. Save time and get concise insights instantly!
          </h6> */}
        </div>
        <div className='flex gap-4 w-full' >
          <span className='bg-customGray rounded-full flex gap-3 w-full'>
            <button className='bg-customGray rounded-full p-3 px-4 flex items-center justify-center'>
              <img width="20" height="20" src="https://img.icons8.com/forma-regular/50/FFFFFF/attach.png" alt="attach" />
            </button>
            <input type="text" className='appearance-none border-none outline-none bg-transparent p-0 m-0 w-full h-14' />
          </span>
          <button className="bg-gradient-to-t from-red-500  to-blue-500 rounded-full p-1 flex items-center justify-center">
            <div className="bg-gray-500 rounded-full p-4 flex items-center justify-center">
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
            actions.map(e => <button key={e} onClick={() => setAction(e)} className={` ${action == e ? 'bg-gradient-to-t from-blue-500 to-gray-500 p-1 rounded-full' : ''}`}>
              <span className='bg-gray-500 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
                {e}
              </span>
            </button>
            )
          }
          <Dialog>
      <DialogTrigger asChild>
      <button className='bg-gray-500 p-3 px-4 text-xl rounded-full  flex items-center justify-center'>
            Custom
          </button>
        {/* <Button variant="outline">Edit Profile</Button> */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            {/* <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value="Pedro Duarte" className="col-span-3" /> */}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            {/* <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input id="username" value="@peduarte" className="col-span-3" /> */}
          </div>
        </div>
        <DialogFooter>
          {/* <Button type="submit">Save changes</Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
          
        </div>
        <h6 className='font-mulish font-bold' > CHOOSE LANUAGE ? </h6>
        <div className='flex gap-3'>
          {
            languages.map(e => <button key={e} onClick={() => setLanguage(e)} className={` ${language == e ? 'bg-gradient-to-t from-red-500 to-gray-500 p-1 rounded-full' : ''}`}> <span className='bg-gray-500 p-3 px-4 text-xl rounded-full  flex items-center justify-center' >
              {e}
            </span>
            </button>
            )
          }
          <button className='bg-gray-500 p-3 px-4 text-xl rounded-full  flex items-center justify-center'>
            Other
          </button>
        </div>
      </div>
    </div>
    </>

  )
}

export default page