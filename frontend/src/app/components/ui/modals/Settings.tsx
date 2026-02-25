import React, { Fragment, useState } from "react"
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Tab,
    TabGroup,
    TabList,
    TabPanel,
    TabPanels,
    Transition,
    TransitionChild,
} from "@headlessui/react"
import {
    User,
    LinkIcon,
    Database,
    Settings2,
    LogOut,
} from "lucide-react"
import clsx from "clsx"
import Memory from "../tabs/Memory"
import CustomInstructions from "../tabs/Preference"
import Profile from "../tabs/Profile"
import Link from "next/link";
import Integrations from "../tabs/Integrations"

const tabs = [
    { name: "Profile", icon: User },
    { name: "Preference", icon: Settings2 },
    { name: "Integrations", icon: LinkIcon },
    { name: "Memory", icon: Database },
]

export default function SettingsDialog({
    isOpen,
    setIsOpen,
    userContext,
}: any) {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="relative z-[60] font-mono"
        >
            {/* 🌟 Animated Backdrop */}
            <DialogBackdrop
                transition
                className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                    bg-black/30 dark:bg-black/60"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                {/* 🌟 Animated Panel */}
                <DialogPanel
                    transition
                    className="w-full max-w-3xl h-[70vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-[#0b0b0b] dark:border-secondary dark:shadow-black/50"
                >
                    <TabGroup selectedIndex={activeTab} onChange={setActiveTab} className="flex h-full">

                        {/* LEFT SIDEBAR */}
                        <div className="w-48 sm:w-56 flex flex-col border-r p-4 transition-colors
                            bg-slate-50 border-slate-200
                            dark:bg-tertiary dark:border-secondary"
                        >
                            <TabList className="space-y-2 flex-1">
                                {tabs.map((tab) => (
                                    <Tab
                                        key={tab.name}
                                        className={({ selected }) =>
                                            clsx(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl outline-none font-medium transition-all duration-200",
                                                selected
                                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 dark:bg-white/10 dark:text-white dark:border-transparent dark:shadow-none"
                                                    : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                                            )
                                        }
                                    >
                                        <tab.icon size={18} />
                                        {tab.name}
                                    </Tab>
                                ))}
                            </TabList>

                            {/* Logout Button */}
                            <Link
                                href="/account/logout"
                                className="mt-auto w-full flex justify-center items-center gap-2 p-2.5 rounded-xl outline-none font-semibold transition-colors
                                    bg-red-50 text-red-600 hover:bg-red-100
                                    dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                                <LogOut size={16} />
                                Logout
                            </Link>
                        </div>

                        {/* RIGHT CONTENT AREA */}
                        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                            <TabPanels className="flex-1 overflow-y-auto custom-scrollbar p-6">

                                {/* 🌟 Native CSS Animations replace the heavy Transition wrapper */}
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
                </DialogPanel>
            </div>
        </Dialog>
    )
}






