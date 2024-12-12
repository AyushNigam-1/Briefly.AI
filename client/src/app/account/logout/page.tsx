"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

const Logout = () => {
    // let router 
    // const [isMounted, setIsMounted] = useState(false); // Track if component is mounted

    // useEffect(() => {
    //     // Check if the component is mounted (i.e., running in the client-side)
    //     setIsMounted(true);
       
    //     if (isMounted) {
    //         router = useRouter();
    //             }
    //     // Logout function runs once the component is mounted
    //     const logout = async () => {
    //         try {
    //             const response = await axios.post('/api/logout', {}, { withCredentials: true });

    //             if (response.status === 200) {
    //                 // After successfully logging out, redirect the user
    //                 router.push("/login"); // Redirect to the login page or homepage
    //             } else {
    //                 console.error("Logout failed: ", response.data);
    //             }
    //         } catch (error) {
    //             console.error("Logout request failed:", error);
    //         }
    //     };
    //     if (isMounted) {
    //         logout();
    //     }
    //     // Perform logout only after the component has mounted (client-side)
        
    // }, [router, isMounted]); // Dependency array ensures it runs after component mounts

    // // Show a loading message while the component is mounting
    // if (!isMounted) {
    //     return <div>Loading...</div>;
    // }

    // return <div>Logging you out...</div>;
};

export default Logout;
