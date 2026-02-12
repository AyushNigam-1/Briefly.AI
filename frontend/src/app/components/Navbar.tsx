import React, { useMemo } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import Link from 'next/link';
import Cookies from 'js-cookie';
import { NavbarProps, Option } from '../types';
import { Heart, LogOut, Settings, Timer, User, UserIcon, UserPlus } from 'lucide-react';

const Navbar: React.FC<NavbarProps> = ({ component }) => {

    const options = useMemo<Option[]>(() => [{
        label: "Login", route: '/account/login', icon: (<User size={20} />
        )
    }, {
        label: 'Signup', route: '/account/signup', icon: (<UserPlus size={20} />)
    }], [])

    const options2 = useMemo<Option[]>(() => [
        {
            label: "Settings", route: '', icon: (<Settings size={20} />)
        },
        {
            label: "Favourites", route: '/favourites', icon: (<Heart size={20} />)
        },
        {
            label: 'Logout', route: '/account/logout', icon: (<LogOut size={20} />)
        }
    ], [])

    const renderMenuItems = (options: Option[]) => options.map(option => (
        <MenuItem key={Math.random()}>
            <Link href={option.route} className="group z-50 flex w-full p-2 items-center gap-2 rounded-lg data-[focus]:bg-white/5 text-lg font-bold">
                {
                    option.icon ? option.icon : ""
                }
                {option.label}
            </Link>
        </MenuItem>
    ));

    return (
        <div className='flex justify-between relative items-center max-w-6xl mx-auto py-3 border-b-2 border-secondary' >
            {component ?? null}
            <div>
                <img src="/logo.png" alt="" className='w-40 h-auto ' />
            </div>
            <Menu>
                <MenuButton className="text-secondary bg-primary p-3 rounded-full flex gap-2 items-center text-lg">
                    <User size="20" />
                </MenuButton>
                <MenuItems
                    transition
                    anchor="bottom end"
                    className="w-52 origin-top-right my-3 rounded-xl border border-gray-800 bg-[#0b0b0b] text-sm/6 text-primary transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50 flex flex-col p-2">

                    {Cookies.get('access_token') ? renderMenuItems(options2) : renderMenuItems(options)}
                </MenuItems>
            </Menu>
        </div>
    )
}

export default Navbar