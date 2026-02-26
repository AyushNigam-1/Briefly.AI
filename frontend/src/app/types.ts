import { JSX, ReactNode } from "react";

export type metadata = {
    title: string;
    thumbnail: string;
    metadata: string;
    preview: boolean;
    type: string
};

export type query = {
    blocked?: boolean
    sender: string;
    content: string;
    thought?: string;
    sources?: [];
    files?: FileMetadata[]
    created_at: string
};

export type FileMetadata = {
    name: string,
    type: string,
    size: number,
    url: ""
}
export type SortOptions = {
    icon: JSX.Element;
    sort: string;
    order: string;
}
export type SummaryResponse = {
    thought: string;
    summarized_summary: string;
    id: string;
    queries: query[] | [];
}

export type ProgressResponse = {
    progress: number;
    message: string;
}

export type SummaryHistoryResponse = {
    id: string;
    title: string;
    timestamp: string;
    url: string;
    queries: number;
    type: string;
    thumbnail: string;
}

export interface SidebarProps {
    setId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export type WebSocketListeners = {
    onMessage?: (data: ProgressResponse) => void;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
}

export interface NavbarProps {
    component?: ReactNode;
}
export interface PromptResponse {
    prompt?: string
    error?: string

}
export type Option = {
    label: string;
    route: string;
    icon?: JSX.Element
};

export type Metadata = {
    icon: string,
    title: string,
    type: string
}

export interface QueryInputProps {
    setQueries: React.Dispatch<React.SetStateAction<query[]>>;
    url: string;
    setState: React.Dispatch<React.SetStateAction<string | undefined>>;
    id?: string
    ytRecommendations?: ytRecommendations[]
    webRecommendations?: webRecommendations[]
    isloading: boolean
    cancelRecommendations?: () => void;
    fetchRecommendations?: (query: string) => void;
}

export interface SummaryCardProps {
    summary: SummaryHistoryResponse;
    handleDeleteSummary: (id: string) => void;
    setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSummaryId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export type ytRecommendations = {
    title: string,
    link: string,
    channel_name: string,
    thumbnail: string
}
export type webRecommendations = {
    title: string,
    link: string,
    website_name: string,
    icon: string,
}