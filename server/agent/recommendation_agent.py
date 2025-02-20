import os
from phi.agent import Agent
from phi.model.groq import Groq
# from googlesearch import search
from phi.tools.duckduckgo import DuckDuckGo

# Set up Groq API key
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

# Define the Recommendation Agent
def create_recommendation_agent():
    recommendation_agent = Agent(
        name="Recommendation Agent",
        role="Take a summary as input and find similar websites and YouTube videos.",
        model=Groq(id="deepseek-r1-distill-llama-70b", api_key=GROQ_API_KEY), 
        tools=[DuckDuckGo()],
        instructions=[
            "Take a summary as input.",
            "Find similar websites by searching the web using the summary as a query.",
            "Find relevant YouTube videos by searching YouTube using the summary as a query.",
            "Return the results in **strict JSON format** like this:",    
            "{",
            '  "youtube": [',
            '    {"title": "Video Title 1", "channel_name": "Channel Name 1", "link": "https://youtube.com/video1"},',
            '    {"title": "Video Title 2", "channel_name": "Channel Name 2", "link": "https://youtube.com/video2"},',
            '    {"title": "Video Title 3", "channel_name": "Channel Name 3", "link": "https://youtube.com/video3"},',
            '    {"title": "Video Title 4", "channel_name": "Channel Name 4", "link": "https://youtube.com/video4"},',
            '    {"title": "Video Title 5", "channel_name": "Channel Name 5", "link": "https://youtube.com/video5"}',
            "  ],",
            '  "website": [',
            '    {"title": "Website Title 1", "website_name": "Website Name 1", "link": "https://website1.com"},',
            '    {"title": "Website Title 2", "website_name": "Website Name 2", "link": "https://website2.com"},',
            '    {"title": "Website Title 3", "website_name": "Website Name 3", "link": "https://website3.com"},',
            '    {"title": "Website Title 4", "website_name": "Website Name 4", "link": "https://website4.com"},',
            '    {"title": "Website Title 5", "website_name": "Website Name 5", "link": "https://website5.com"}',
            "  ]",
            "}",
            "",
        ],
        markdown=False,
    )
    return recommendation_agent