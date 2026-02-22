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
import Memory from "./tabs/Memory"
import CustomInstructions from "./tabs/Preference"
import Profile from "./tabs/Profile"
import Link from "next/link";

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
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center font-mono">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-3xl h-[70vh] bg-[#0b0b0b] border border-secondary rounded-xl overflow-hidden">

                            <TabGroup selectedIndex={activeTab} onChange={setActiveTab} className="h-full">
                                <div className="flex h-full ">
                                    <div className="w-52 border-r border-secondary bg-tertiary text-primary p-4 flex flex-col h-full">
                                        <TabList className=" space-y-3 h-full">
                                            {tabs.map((tab) => (
                                                <Tab
                                                    key={tab.name}
                                                    className={({ selected }) =>
                                                        clsx(
                                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg outline-none",
                                                            selected
                                                                ? "bg-white/5 text-white"
                                                                : "text-gray-400 hover:bg-white/5"
                                                        )
                                                    }
                                                >
                                                    <tab.icon size={16} />
                                                    {tab.name}
                                                </Tab>
                                            ))}
                                        </TabList>
                                        <Link
                                            href="/account/logout"
                                            className="mt-auto w-full flex text-center justify-center items-center gap-3 p-2 rounded-lg outline-none text-red-400/90 bg-red-500/10 font-medium"
                                        >
                                            <LogOut size={14} />
                                            Logout
                                        </Link>
                                    </div>
                                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                        <Transition
                                            key={activeTab}
                                            appear
                                            show
                                            enter="transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                            enterFrom="opacity-0 translate-y-3 scale-[0.98]"
                                            enterTo="opacity-100 translate-y-0 scale-100"
                                            leave="transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                            leaveFrom="opacity-100 translate-y-0 scale-100"
                                            leaveTo="opacity-0 translate-y-2 scale-[0.98]"
                                        >
                                            <TabPanels className="p-4 overflow-y-auto custom-scrollbar"
                                            >

                                                <TabPanel className="space-y-4">
                                                    <Profile />
                                                </TabPanel>

                                                <TabPanel className="space-y-4">
                                                    <CustomInstructions />
                                                </TabPanel>

                                                <TabPanel>
                                                    <p className="text-slate-400">
                                                        Manage Notion, APIs, MCP servers.
                                                    </p>
                                                </TabPanel>

                                                <TabPanel className="space-y-6">
                                                    <Memory />
                                                </TabPanel>

                                            </TabPanels>
                                        </Transition>
                                    </div>
                                </div>
                            </TabGroup>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}






