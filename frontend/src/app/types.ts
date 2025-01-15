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