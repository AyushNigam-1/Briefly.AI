import { Fragment, useState } from "react"
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
    X,
    User,
    Brain,
    Link,
    Palette,
    Database,
} from "lucide-react"
import clsx from "clsx"

const tabs = [
    { name: "Profile", icon: User },
    { name: "Instructions", icon: Brain },
    { name: "Integrations", icon: Link },
    { name: "Memory", icon: Database },
    { name: "Appearance", icon: Palette },
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
                        <DialogPanel className="w-full max-w-2xl h-[50vh] bg-[#0b0b0b] border border-secondary rounded-xl overflow-hidden">

                            <TabGroup selectedIndex={activeTab} onChange={setActiveTab} className="h-full">
                                <div className="flex h-full">
                                    <TabList className="w-52 border-r border-secondary bg-tertiary text-primary p-4 space-y-3 h-full">
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

                                    <div className="flex-1 flex flex-col">

                                        <TabPanels className="flex-1 overflow-y-auto p-4">

                                            <TabPanel className="space-y-4">
                                                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl">
                                                    <div className="h-12 w-12 rounded-full bg-primary  flex items-center justify-center font-bold ">
                                                        {userContext?.name?.[0] || "A"}
                                                    </div>
                                                    <div className="text-primary ">
                                                        <p className="font-semibold">{userContext?.name || "Ayush"}</p>
                                                        <p className="text-sm text-slate-400">
                                                            ayu@briefly.ai
                                                        </p>
                                                    </div>
                                                </div>
                                            </TabPanel>

                                            <TabPanel>
                                                <textarea
                                                    className="w-full h-40 bg-white/5 rounded-xl p-3 outline-none"
                                                    placeholder="Tell the AI how to behave globally..."
                                                />
                                            </TabPanel>

                                            <TabPanel>
                                                <p className="text-slate-400">
                                                    Manage Notion, APIs, MCP servers.
                                                </p>
                                            </TabPanel>

                                            <TabPanel>
                                                <p className="text-slate-400">
                                                    View / delete long-term user memory.
                                                </p>
                                            </TabPanel>

                                            <TabPanel>
                                                <p className="text-slate-400">
                                                    Theme + UI preferences.
                                                </p>
                                            </TabPanel>

                                        </TabPanels>

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
