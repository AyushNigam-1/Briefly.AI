export type metadata = {
    title: string;
    icon: string;
    metadata: string;
};

export type query = {
    sender?: string;
    content?: string
};

export type SummaryResponse = {
    summarized_summary: string;
    id: string;
    queries: query[] | [];
}

export type ProgressResponse = {
    progress: number;
    message: string;
}

export type WebSocketListeners = {
    onMessage?: (data: ProgressResponse) => void;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
  }