"use client"
import React, { useState, useEffect, useRef } from "react";
import  Link from "next/link";

// Define the types for options
interface DropdownOption {
    name: string;
    route: string;
    svg: JSX.Element;
    color: string;
}

interface DropdownProps {
    icon: React.ReactNode; 
    options: DropdownOption[];
}

const Dropdown: React.FC<DropdownProps> = ({ icon, options }) => {
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscapeKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [dropdownRef]);

    const openDropdown = () => {
        setIsVisible(true);
        setTimeout(() => {
            setIsActive(true);
        }, 10);
    };

    const closeDropdown = () => {
        setIsActive(false);
        setTimeout(() => {
            setIsVisible(false);
        }, 300);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center overflow-hidden rounded-md ">
                <button
                    onClick={() => (isActive ? closeDropdown() : openDropdown())}
                    className="text-white "
                >
                    <span className="sr-only">Menu</span>
                    {icon}
                </button>
            </div>

            {isVisible && (
                <div
                    className={`absolute right-0 z-99 mt-2 w-44 rounded-md border border-gray-700 bg-gray-900/90 shadow-lg transition-opacity duration-300 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`}
                    role="menu"
                >
                    <div className="p-2">
                        {options.map((option) => (
                            <Link
                                key={option.route} // Always include a key when rendering lists
                                href={option.route}
                                passHref
                                className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-md font-semibold ${option.color}`}
                            >
                                {/* <a
                                    className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-md font-semibold ${option.color} hover:bg-green-50`}
                                    role="menuitem"
                                > */}
                                    {option.svg}
                                    {option.name}
                                {/* </a> */}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dropdown;
