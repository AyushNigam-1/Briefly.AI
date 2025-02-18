import os
from crewai import Agent, Task, Crew
from crewai.tools import DuckDuckGoSearchTool, YoutubeSearchTool
from crewai.llms import ChatGroq

# Set up Groq API key
GROQ_API_KEY = os.getenv('groq_api_key')

# Define the LLM
llm = ChatGroq(model="mixtral-8x7b-32768", api_key=GROQ_API_KEY)

# Define the Search Agent
search_agent = Agent(
    role="Search Expert",
    goal="Find relevant websites and YouTube videos based on a given summary.",
    backstory="An expert researcher who quickly finds useful information online.",
    tools=[DuckDuckGoSearchTool(), YoutubeSearchTool()],
    llm=llm
)

# Define the Search Task
search_task = Task(
    description=(
        "Given a summary, search the web for similar websites and relevant YouTube videos."
        "Return a list of relevant links."
    ),
    agent=search_agent
)

# Create the Crew
recommendation_crew = Crew(agents=[search_agent], tasks=[search_task])

def get_recommendations(summary):
    return recommendation_crew.kickoff(inputs={"summary": summary})


