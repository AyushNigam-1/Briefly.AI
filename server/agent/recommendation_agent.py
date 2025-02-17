import os
from phidata.agent import Agent
from phidata.llm import Groq
from googlesearch import search
from phi.tools.duckduckgo import DuckDuckGo

# Set up Groq API key
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

# Define the Recommendation Agent
def create_recommendation_agent():
    recommendation_agent = Agent(
        name="Recommendation Agent",
        role="Take a summary as input and find similar websites and YouTube videos.",
        model=Groq(id="mixtral-8x7b-32768", api_key=GROQ_API_KEY), 
        tools=[DuckDuckGo()],
        instructions=[
            "Take a summary as input.",
            "Find similar websites by searching the web using the summary as a query.",
            "Find relevant YouTube videos by searching YouTube using the summary as a query.",
            "Return the list of similar websites and YouTube videos."
        ],
        markdown=False,
    )
    return recommendation_agent