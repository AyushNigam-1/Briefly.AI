import React from 'react'

const Navbar = () => {
    return (
        <div className='flex justify-between items-center container mx-auto my-3' >
            <h3 className='text-3xl font-mulish font-extrabold ' >
                Briefly.AI
            </h3>
            <button className='bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg' >
            <img width="20" height="20" src="https://img.icons8.com/material-outlined/24/FFFFFF/user--v1.png" alt="user--v1"/>
                Account
            </button>
        </div>
    )
}

export default Navbar