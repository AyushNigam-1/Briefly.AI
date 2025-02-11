import React, { JSX, ReactNode, useMemo } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import Link from 'next/link';
import Cookies from 'js-cookie';


interface NavbarProps {
    component?: ReactNode;
}

type Option = {
    label: string;
    route: string;
    icon?: JSX.Element
};

const Navbar: React.FC<NavbarProps> = ({ component }) => {

    const options = useMemo<Option[]>(() => [{ label: "Login", route: '/account/login' }, { label: 'Create Account', route: '/account/signup' }], [])
    const options2 = useMemo<Option[]>(() => [{
        label: "Profile", route: '/account/profile', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        )
    },
    {
        label: "History", route: '/history', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>

        )
    }
        , {
        label: 'Logout', route: '/account/logout', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        )
    }], [])

    const renderMenuItems = (options: Option[]) => options.map(option => (
        <MenuItem key={Math.random()}>
            <Link href={option.route} className="group z-50 flex w-full items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10 text-lg font-semibold">
                {
                    option.icon ? option.icon : ""
                }
                {option.label}

            </Link>
        </MenuItem>
    ));

    return (
        <div className='flex justify-between relative  items-center container mx-auto py-3 border-b-2 border-gray-400' >
            {component ? component : <div></div>}
            <div>
                <img src="/logo.png" alt="" className='w-40 h-auto ' />
            </div>
            <Menu>
                <MenuButton className="bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg">
                    Account
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>

                </MenuButton>
                <MenuItems
                    transition
                    anchor="bottom end"
                    className="w-52 origin-top-right my-2 rounded-xl border-2 border-gray-500 bg-gray-900 p-1 text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50">

                    {Cookies.get('access_token') ? renderMenuItems(options2) : renderMenuItems(options)}
                </MenuItems>
            </Menu>
        </div>
    )
}

export default Navbar