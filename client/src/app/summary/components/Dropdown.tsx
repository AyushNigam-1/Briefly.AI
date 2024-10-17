import { useState } from "react";

// Define a TypeScript type for the user object
interface User {
    id: number;
    name: string;
    img: string;
}

const users: User[] = [
    {
        id: 0,
        name: "Wade Cooper",
        img: "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
        id: 1,
        name: "Tom Cook",
        img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
];

export default function Dropdown() {
    const [isOpen, setIsOpen] = useState<boolean>(false); // Boolean state
    const [selectedUser, setSelectedUser] = useState<User>(users[1]); // User state

    // Toggle dropdown open/close state
    const toggleDropdown = () => setIsOpen((prev) => !prev);

    // Handle user selection
    const handleSelect = (user: User) => {
        setSelectedUser(user);
        setIsOpen(false);
    };

    return (
        <div>
            <div className="relative">
                <button
                    type="button"
                    className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"
                    onClick={toggleDropdown}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-labelledby="listbox-label"
                >
                    <span className="flex items-center">
                        <img
                            src={selectedUser.img}
                            alt={selectedUser.name}
                            className="h-5 w-5 flex-shrink-0 rounded-full"
                        />
                        <span className="ml-3 block truncate">{selectedUser.name}</span>
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
                        className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                        role="listbox"
                        aria-labelledby="listbox-label"
                    >
                        {users.map((user) => (
                            <li
                                key={user.id}
                                className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900"
                                onClick={() => handleSelect(user)}
                                role="option"
                            >
                                <div className="flex items-center">
                                    <img
                                        src={user.img}
                                        alt={user.name}
                                        className="h-5 w-5 flex-shrink-0 rounded-full"
                                    />
                                    <span className="ml-3 block truncate">{user.name}</span>
                                </div>
                                {selectedUser.id === user.id && (
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
