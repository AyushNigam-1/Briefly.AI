export type yt_metadata = {
    type: string,
    title: string;
    thumbnail_url: string;
    channel_name: string;
};
export type web_metadata = {
    type: string,
    title: string;
    favicon: string;
    base_url: string,
    meta_description: string
};
export interface query {
    sender?: string;
    content?: string
};