import { useState } from "react"
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Tab,
    TabGroup,
    TabList,
    TabPanel,
    TabPanels,
} from "@headlessui/react"
import {
    User,
    LinkIcon,
    Database,
    Settings2,
    LogOut,
    X,
    Stars,
    Star,
} from "lucide-react"
import clsx from "clsx"
import Memory from "../tabs/Memory"
import CustomInstructions from "../tabs/Preference"
import Profile from "../tabs/Profile"
import Integrations from "../tabs/Integrations"
import { authClient } from "@/app/lib/auth-client"
import Link from "next/link"

const tabs = [
    { name: "Profile", icon: User },
    { name: "Preference", icon: Settings2 },
    { name: "Integrations", icon: LinkIcon },
    { name: "Memory", icon: Database },
]

export default function SettingsDialog({
    isOpen,
    setIsOpen,
}: any) {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="relative z-[60] font-mono"
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                    bg-black/30 dark:bg-black/60"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">

                <DialogPanel
                    transition
                    className="w-full max-w-3xl h-[85vh] sm:h-[70vh] relative transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4"
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 p-1.5 sm:p-2 rounded-full z-50 outline-none transition-colors shadow-sm border
                            bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-200 
                            dark:bg-[#1e1e1e] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        title="Close Settings"
                    >
                        <X size={16} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
                    </button>

                    <div className="w-full h-full flex flex-col rounded-2xl border shadow-2xl overflow-hidden
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-[#0b0b0b] dark:border-secondary dark:shadow-black/50"
                    >
                        <TabGroup selectedIndex={activeTab} onChange={setActiveTab} className="flex flex-row h-full w-full">

                            <div className="w-[60px] sm:w-48 md:w-56 flex flex-col items-center sm:items-stretch border-r p-2 sm:p-4 transition-all duration-300 flex-shrink-0
                                bg-slate-50 border-slate-200
                                dark:bg-tertiary dark:border-secondary"
                            >
                                <TabList className="flex flex-col gap-2 sm:gap-3 w-full mt-2 sm:mt-0">
                                    {tabs.map((tab) => (
                                        <Tab
                                            key={tab.name}
                                            className={({ selected }) =>
                                                clsx(
                                                    "w-full flex justify-center sm:justify-start items-center gap-0 sm:gap-3 p-3 sm:px-3 sm:py-2 rounded-xl outline-none transition-colors",
                                                    selected
                                                        ? "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white"
                                                        : "text-slate-500 hover:bg-slate-200/50 dark:text-gray-400 dark:hover:bg-white/5"
                                                )
                                            }
                                            title={tab.name}
                                        >
                                            <tab.icon className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="hidden sm:inline font-medium text-sm sm:text-base">{tab.name}</span>
                                        </Tab>
                                    ))}
                                </TabList>
                                <div className="mt-auto space-y-4 w-full">
                                    <Link
                                        href="/subscription/plans"
                                        onClick={() => setIsOpen(false)}
                                        className="w-full flex items-center justify-center gap-0 sm:gap-2 p-3 sm:px-6 sm:py-3 bg-primary text-tertiary rounded-xl font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
                                    >
                                        <Stars className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
                                        <span className="hidden sm:inline">Upgrade</span>
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            await authClient.signOut();
                                            window.location.href = "/account/login";
                                        }}
                                        className="w-full flex justify-center items-center gap-0 sm:gap-2 p-3 sm:px-3 sm:py-2.5 rounded-xl outline-none transition-colors
        bg-red-50 text-red-600 hover:bg-red-100
        dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
                                        <span className="hidden sm:inline">Logout</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
                                <TabPanels className="flex-1 overflow-y-auto scrollbar-none p-4 sm:p-6">
                                    <TabPanel className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                                        <Profile />
                                    </TabPanel>
                                    <TabPanel className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                                        <CustomInstructions />
                                    </TabPanel>
                                    <TabPanel className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                                        <Integrations />
                                    </TabPanel>
                                    <TabPanel className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                                        <Memory />
                                    </TabPanel>
                                </TabPanels>
                            </div>

                        </TabGroup>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}