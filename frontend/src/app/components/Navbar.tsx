import React, { ReactNode, useMemo } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import Link from 'next/link';
import Cookies from 'js-cookie';


interface NavbarProps {
    component?: ReactNode;
}

type Option = {
    label: string;
    route: string;
};

const Navbar: React.FC<NavbarProps> = ({ component }) => {

    const options = useMemo<Option[]>(() => [{ label: "Login", route: '/account/login' }, { label: 'Create Account', route: '/account/signup' }], [])
    const options2 = useMemo<Option[]>(() => [{ label: "Profile", route: '/account/profile' }, { label: 'Logout', route: '/account/logout' }], [])

    const renderMenuItems = (options: Option[]) => options.map(option => (
        <MenuItem key={Math.random()}>
            <Link href={option.route} className="group z-50 flex w-full items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10 text-lg font-semibold">
                {option.label}
            </Link>
        </MenuItem>
    ));

    return (
        <div className='flex justify-between items-center container mx-auto my-3' >
            {component}
            <h3 className='text-3xl font-mulish font-extrabold ' >
                Briefly.AI
            </h3>
            <Menu>
                <MenuButton className="bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg">
                    <img width="20" height="20" src="https://img.icons8.com/material-outlined/24/FFFFFF/user--v1.png" alt="user--v1" />
                    Account
                </MenuButton>
                <MenuItems
                    transition
                    anchor="bottom end"
                    className="w-52 origin-top-right rounded-xl border border-white/5 bg-gray-900 p-1 text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50">
                    {Cookies.get('access_token') ? renderMenuItems(options2) : renderMenuItems(options)}
                </MenuItems>
            </Menu>
        </div>
    )
}

export default Navbar