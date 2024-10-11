"use client"
import { useParams } from 'next/navigation';
const SummaryPage = () => {
    const params = useParams();
    const url = params['url'];
    return (
        <div>
            <h1>Summary for: {url}</h1>
        </div>
    );
};

export default SummaryPage;
