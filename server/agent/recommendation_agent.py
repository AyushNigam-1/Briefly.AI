import os
from phi.agent import Agent
from phi.model.groq import Groq
from phi.tools.duckduckgo import DuckDuckGo 
from phi.tools.youtube_tools import YouTubeTools
from phi.tools.website import WebsiteTools

# Set up Groq API key
GROQ_API_KEY = os.getenv('groq_api_key')

# Define the Recommendation Agent
def create_recommendation_agent():
    recommendation_agent = Agent(
        name="Recommendation Agent",
        role="Take a summary as input and find similar websites and YouTube videos.",
        model=Groq(id="deepseek-r1-distill-llama-70b", api_key=GROQ_API_KEY), 
        tools=[DuckDuckGo(),WebsiteTools(),YouTubeTools()],
        instructions=[ 
                "You are an intelligent web search and extraction agent. Your task is to take a summary as input and find relevant YouTube videos and websites. Your response must be in valid JSON format with accurate data."

        "Guidelines:"
        "1. Find relevant YouTube videos by searching YouTube using the summary as a query."
        "2. Extract the correct YouTube video ID from the URL:"
        "   - If the URL follows 'https://www.youtube.com/watch?v=VIDEO_ID', extract 'VIDEO_ID' after 'v='."
        "   - If the URL follows 'https://youtu.be/VIDEO_ID', extract 'VIDEO_ID' directly."
        "   - Remove any extra parameters such as '&t=30s'."
        "   - Validate that 'VIDEO_ID' contains only alphanumeric characters, hyphens (-), and underscores (_)."
        "   - Construct the thumbnail URL using:"
        '     "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg"'
        "   - If the 'maxresdefault.jpg' version does not exist, use:"
        '     "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg"'
        "3. Find relevant websites using the summary as a query."
        "4. Extract the best possible website icon:"
        "   - First, check if the website has an Open Graph ('og:image') tag. If available, use it as the 'icon'."
        "   - If 'og:image' is not available, check for the default favicon at 'https://website.com/favicon.ico'."
        "   - If neither is available, set 'icon': null."
        "   - Ensure the extracted 'icon' is a valid image URL ending with .jpg, .png, .ico, or .webp."
        "5. The final JSON output must follow this exact structure, with no additional text, formatting, or explanations:"

        "{"
        '  "youtube": ['
        '    {"title": "Video Title 1", "channel_name": "Channel Name 1", "link": "https://www.youtube.com/watch?v=VIDEO_ID_1", "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID_1/maxresdefault.jpg"},'
        '    {"title": "Video Title 2", "channel_name": "Channel Name 2", "link": "https://www.youtube.com/watch?v=VIDEO_ID_2", "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID_2/maxresdefault.jpg"}'
        "  ],"
        '  "website": ['
        '    {"title": "Website Title 1", "website_name": "Website Name 1", "link": "https://website1.com", "icon": "https://website1.com/favicon.ico"},'
        '    {"title": "Website Title 2", "website_name": "Website Name 2", "link": "https://website2.com", "icon": "https://website2.com/favicon.ico"}'
        "  ]"
        "}"

        "6. If no results are found, return an empty list for 'youtube' or 'website', but maintain the JSON structure."
        "7. Do NOT return any text other than the JSON object."
        ],
        markdown=False,
    )
    return recommendation_agent
