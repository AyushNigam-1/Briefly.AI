import { Dispatch, JSX, ReactNode, SetStateAction } from "react";

export type metadata = {
    title: string;
    thumbnail: string;
    metadata: string;
    preview: boolean;
    type: string
};

export type query = {
    id?: string
    blocked?: boolean
    sender: string;
    content: string;
    thought?: string;
    sources?: [];
    files?: FileMetadata[]
    created_at: string;
    thinking?: string;
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
    is_pinned?: boolean
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

export interface DeleteChatDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}


interface SearchMessage {
    sender: "user" | "llm";
    content: string;
    created_at: string;
}

export interface SearchResult {
    id: string;
    title: string;
    timestamp: string;
    messages: SearchMessage[];
}

export interface SearchModalProps {
    onCloseSidebar: () => void;
}

export interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: string;
    chatTitle?: string;
}

export interface Task {
    id: string
    name: string
    is_active: boolean
    created_at?: string
}

export interface SearchModalProps {
    onCloseSidebar: () => void;
}

type Source = {
    title?: string;
    link?: string;
    snippet?: string;
};

export interface SourcesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sources: Source[];
}

export interface ChatsProps {
    queries: query[];
    setQueries: Dispatch<SetStateAction<query[]>>;
    isPending: boolean;
    handleSend: (query: string, files: File[], modal: string) => Promise<void>;
    query: string;
    setQuery: (value: string) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleStop: () => void;
    loadOlderChats: () => Promise<void>;
    isLoadingOlder: boolean;
    hasMore: boolean;
    handleRegenerate: (index: number) => Promise<void>;
    handleEdit: (index: number, newContent: string) => Promise<void>;
}

export interface InputProps {
    query: string, setQuery: (value: string) => void, send: (value: string, files: File[], model: string) => void, isPending: boolean, stop: () => void, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

export interface MessageProps {
    q: query;
    isLastItem: boolean;
    isPending: boolean;
    onCopy: (text: string) => void;
    setSources: (sources: any) => void;
    setSourcesOpen: (open: boolean) => void;
    onRegenerate: () => void;
    onEdit: (newContent: string) => void;
}