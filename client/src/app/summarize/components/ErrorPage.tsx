import { useRouter } from "next/navigation";
const ErrorPage = () => {
    const router = useRouter();
    const handleRetry = () => {
        router.refresh();
    };
    return (
        <div className="h-screen w-screen flex items-center justify-center text-white z-50">
            <div className="text-center flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 text-red-500 text-8xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-20">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                </div>
                <h1 className="text-4xl text-gray-200 font-bold">Oops! Something went wrong.</h1>
                <p className="text-lg text-gray-400">
                    Error Code: <span className="font-mono text-xl">403</span>
                </p>
                <button
                    className="shadow-sm ring-1 flex gap-1 items-center bg-gray-900/70 px-4 py-2 rounded-lg"
                    onClick={handleRetry}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Try Again
                </button>
            </div>
        </div>
    )
}

export default ErrorPage