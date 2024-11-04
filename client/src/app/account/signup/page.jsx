import React from 'react'

const page = () => {
    return (
        <div className='w-screen h-screen flex justify-center items-center z-50 font-mono'>
            <div className="py-6 px-8  bg-gray-700/50 rounded-md shadow-xl ">
                <form action="" className='flex flex-col gap-4'>
                    <input type="text" name="name" id="name" placeholder="Email" className="w-full py-2 pl-3  bg-gray-500/50 rounded outline-none focus:ring-indigo-600 :ring-indigo-600" />
                    <input type="text" name="email" id="email" placeholder="Password" className="w-full  py-2 pl-3 rounded  bg-gray-500/50 outline-none focus:ring-indigo-600 :ring-indigo-600" />
                    <a href="#" className="text-sm font-thin text-gray-400 underline hover:underline  inline-block hover:text-indigo-600">Forget Password ?</a>
                    <button className="cursor-pointer py-2 px-4 block  bg-gray-500/50 text-white font-bold w-full text-center rounded">Login
                    </button>
                </form>
            </div>
        </div>
    )
}

export default page