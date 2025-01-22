"use client"
import { useEffect } from 'react';
import axios from 'axios';
import { redirect } from 'next/navigation';
const Logout = () => {

    useEffect(() => {

        const logout = async () => {
            try {
                await axios.post(
                    'http://localhost:8000/logout', // Replace with your backend logout URL
                    {},
                    {
                        withCredentials: true, // Send cookies along with the request
                    }
                );
            } catch (error) {
                console.error('Logout failed:', error);
            }
            finally {
                redirect('/'); // Redirect to the home page or login page after logout
            }
        };

        logout();
    }, []);

    return null; // No UI is needed for this component
};

export default Logout;
