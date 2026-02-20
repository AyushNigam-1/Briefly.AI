import React, { useMemo, useState } from 'react'
import { NavbarProps, Option } from '../../types';
import { Heart, LogOut, Settings, User, UserPlus } from 'lucide-react';
import SettingsDialog from './modals/Settings';

const Navbar: React.FC<NavbarProps> = ({ component }) => {
    const [isOpen, setOpen] = useState<boolean>(false)
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

    // const renderMenuItems = (options: Option[]) => options.map(option => (
    //     <MenuItem key={Math.random()}>
    //         <Link href={option.route} className="group z-50 flex w-full p-2 items-center gap-2 rounded-lg data-[focus]:bg-white/5 text-lg font-bold">
    //             {
    //                 option.icon ? option.icon : ""
    //             }
    //             {option.label}
    //         </Link>
    //     </MenuItem>
    // ));

    return (
        <div className='flex justify-between relative items-center max-w-6xl mx-auto py-4 border-b-2 border-secondary' >
            {component ?? null}
            <div>
                <img src="/logo.png" alt="" className='w-40 h-auto ' />
            </div>
            {/* <Menu> */}
            <button onClick={() => setOpen(true)} className="text-tertiary bg-primary p-3 rounded-full flex gap-2 items-center text-lg">
                <User size="20" />
            </button>
            {/* <MenuItems
                    transition
                    anchor="bottom end"
                    className="w-52 origin-top-right my-3 rounded-xl border bg-tertiary border-gray-800 
                    text-sm/6 text-primary transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50 flex flex-col p-2">
                    {Cookies.get('access_token') ? renderMenuItems(options2) : renderMenuItems(options)}
                </MenuItems> */}
            {/* </Menu> */}
            <SettingsDialog isOpen={isOpen} setIsOpen={setOpen} />
        </div>
    )
}

export default Navbar