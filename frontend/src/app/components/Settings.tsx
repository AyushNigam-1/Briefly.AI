import { Dialog, DialogBackdrop, DialogPanel, Listbox, ListboxButton, ListboxOption, ListboxOptions, Switch } from '@headlessui/react';
import clsx from 'clsx';
import {
    X,
    User,
    Brain,
    Link as LinkIcon,
    Moon,
    LogOut,
    Save,
    Key,
    Database,
    Palette,
    MoonIcon,
    Sun,
    Monitor,
    ChevronDown
} from 'lucide-react';
import React, { useState } from 'react';

const SettingsDialog = ({ isOpen, setIsOpen, userContext }: { isOpen: boolean, setIsOpen: (val: boolean) => void, userContext?: any }) => {
    const themes = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    const [darkMode, setDarkMode] = useState(true);
    const [integrationName, setIntegrationName] = useState('Notion');
    const [integrationKey, setIntegrationKey] = useState('');
    const [theme, setThemes] = useState("Light")
    const [selectedTheme, setSelectedTheme] = useState(themes[0]); // Default to Light object


    return (
        <Dialog open={isOpen} as="div" className="relative z-50 focus:outline-none" onClose={() => setIsOpen(false)}>
            <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="w-full max-w-2xl rounded-2xl flex flex-col bg-tertiary border border-slate-800 shadow-2xl backdrop-blur-xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0 font-mono text-slate-200 p-4 space-y-4"
                    >
                        {/* Header */}
                        <div className='flex justify-between items-center '>
                            <h2 className='text-xl font-bold flex items-center gap-2'>
                                Settings
                            </h2>
                            <button
                                className='hover:text-primary rounded-full transition-colors'
                                onClick={() => setIsOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <hr className="border border-secondary" />

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">

                            {/* Section: Profile */}
                            <section className="space-y-4">
                                {/* <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <User size={16} /> Profile Section
                                </h3> */}
                                <div className="flex items-center gap-4 bg-white/5  p-3 rounded-xl border border-secondary">
                                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-tertiary font-bold text-lg">
                                        {userContext?.name?.[0] || 'A'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{userContext?.name || 'Ayu Developer'}</p>
                                        <p className="text-sm text-slate-400">ayu@briefly.ai</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Custom Prompt Memories */}
                            <div className='space-y-1'>
                                <h3 className="font-semibold text-primary tracking-wider flex items-center gap-2">
                                    <Brain size={14} /> Custom Prompt
                                </h3>
                                {/* <p className="text-xs text-gray-400">Define how the AI should remember your preferences across all chats.</p> */}
                            </div>
                            <textarea
                                placeholder="e.g. 'I am a Solana developer. Always prefer Rust code examples and keep explanations concise.'"
                                className="block w-full h-32 resize-none rounded-xl border-none bg-white/5 p-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                            />
                            <div className='space-y-1'>
                                <h3 className="font-semibold text-primary tracking-wider flex items-center gap-2">
                                    <LinkIcon size={14} /> Integrations
                                </h3>
                                {/* <p className="text-xs text-gray-400">Define how the AI should remember your preferences across all chats.</p> */}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {/* <label className="text-xs text-slate-400 ml-1">Service Name</label> */}
                                    <input
                                        value={integrationName}
                                        onChange={(e) => setIntegrationName(e.target.value)}
                                        className="w-full bg-white/5 border border-secondary rounded-lg p-2.5 text-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    {/* <label className="text-xs text-slate-400 ">Integration Key (Notion Token)</label> */}
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={integrationKey}
                                            onChange={(e) => setIntegrationKey(e.target.value)}
                                            placeholder="ntn_..."
                                            className="w-full bg-white/5 border border-secondary rounded-lg p-2.5 text-sm outline-none"
                                        />
                                        {/* <Key size={16} className="absolute left-3 top-3 text-slate-500" /> */}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Preferences */}
                            <div className="flex justify-between gap-3">
                                <h3 className="font-semibold text-primary tracking-wider flex items-center gap-2">
                                    <Palette size={14} /> Theme
                                </h3>
                                <Listbox value={selectedTheme} onChange={setSelectedTheme}>
                                    <ListboxButton className="relative flex items-center gap-3 cursor-default rounded-lg bg-white/5 py-2 pl-3 pr-10 text-left text-white focus:outline-none border border-secondary hover:bg-white/10 transition-colors sm:text-sm">
                                        {/* Dynamic Icon for the currently selected theme */}
                                        <selectedTheme.icon size={16} className="text-slate-400" />
                                        <span className="block truncate">{selectedTheme.label}</span>

                                        {/* Dropdown Arrow Icon */}
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronDown size={16} className="text-slate-500" />
                                        </span>
                                    </ListboxButton>

                                    <ListboxOptions
                                        anchor="bottom start"
                                        transition
                                        className={clsx(
                                            'w-[var(--button-width)] rounded-xl mt-2 border border-secondary bg-tertiary p-1 shadow-2xl focus:outline-none',
                                            'transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0',
                                            'z-[100]'
                                        )}
                                    >
                                        {themes.map((t) => (
                                            <ListboxOption
                                                key={t.value}
                                                value={t}
                                                className="group flex cursor-pointer items-center gap-3 rounded-lg py-2 px-3 select-none data-[focus]:bg-white/10 data-[selected]:bg-blue-600/20"
                                            >
                                                {/* Icon for each option */}
                                                <t.icon
                                                    size={16}
                                                    className="text-slate-400 group-data-[focus]:text-white transition-colors"
                                                />
                                                <div className="text-sm font-medium text-slate-200 group-data-[focus]:text-white">
                                                    {t.label}
                                                </div>
                                            </ListboxOption>
                                        ))}
                                    </ListboxOptions>
                                </Listbox>
                            </div>

                        </div>
                        <hr className="border border-secondary" />

                        {/* Footer */}
                        <div className='flex justify-between items-center'>
                            <button className='flex w-full text-center items-center justify-center gap-2 p-4 text-sm font-medium text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg transition-all'>
                                <LogOut size={16} /> Logout
                            </button>

                            {/* <button
                                className='flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20'
                                onClick={() => setIsOpen(false)}
                            >
                                <Save size={16} /> Save Changes
                            </button> */}
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
};

export default SettingsDialog;