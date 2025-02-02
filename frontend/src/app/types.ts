export type metadata = {
    title: string;
    icon: string;
    metadata: string;
};

export type query = {
    sender?: string;
    content?: string;
    thought?: string;
};

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
    type: string
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