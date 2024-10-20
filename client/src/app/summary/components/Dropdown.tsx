import { ReactNode, useState } from "react";

interface Option {
    value?: string;
    label?: string;
}

interface DropdownProps {
    icon: ReactNode;
    options: Option[];
    setOption: (value?: Option) => void
    selectedOption?: Option
}

const Dropdown: React.FC<DropdownProps> = ({ icon, options, setOption, selectedOption }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const toggleDropdown = () => setIsOpen((prev) => !prev);

    const handleSelect = (option: Option) => {
        setOption(option)
        setIsOpen(false);
    };

    return (
        <div>
            <div className="relative">
                <button
                    type="button"
                    className="relative w-full rounded-md bg-gray-900/70 py-1.5 pl-3 pr-10 text-left text-white shadow-sm ring-1 focus:outline-none  sm:text-sm sm:leading-6 cursor-pointer"
                    onClick={toggleDropdown}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-labelledby="listbox-label"
                >
                    <span className="flex items-center">
                        {icon}
                        <span className="ml-3 block truncate">{selectedOption?.label}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                        <svg
                            className="h-5 w-5 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </span>
                </button>

                {isOpen && (
                    <ul
                        className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-gray-900 text-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                        role="listbox"
                        aria-labelledby="listbox-label"
                    >
                        {options.map((option) => (
                            <li
                                key={Math.random()}
                                className="relative cursor-pointer hover:bg-gray-700/50 select-none py-2 pl-3 pr-9 "
                                onClick={() => handleSelect(option)}
                                role="option"
                            >
                                <div className="flex items-center">
                                    {/* <img
                                        src={user.img}
                                        alt={user.name}
                                        className="h-5 w-5 flex-shrink-0 rounded-full"
                                    /> */}
                                    <span className="ml-3 block truncate">{option.label}</span>
                                </div>
                                {selectedOption?.value === option.value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                        <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
export default Dropdown;