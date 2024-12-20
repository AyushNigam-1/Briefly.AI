export type yt_metadata = {
    type: "youtube";
    title: string;
    thumbnail_url: string;
    channel_name: string;
};

export type web_metadata = {
    type: "web";
    title: string;
    favicon: string;
    base_url: string;
    meta_description: string;
};

export type file_metadata = {
    type: string;
    title: string;
    size: string;
    thumbnail:string
};
export interface query {
    sender?: string;
    content?: string
};


export type Metadata = yt_metadata | web_metadata | file_metadata;
