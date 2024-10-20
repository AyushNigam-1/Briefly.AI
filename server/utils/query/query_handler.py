from langchain_community.document_loaders import UnstructuredURLLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain.chains.qa_with_sources import load_qa_chain
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("groq_api_key")

def ask_question_on_summary(summary: str, question: str) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

    # QA prompt template
    prompt_template = """
    Answer the following question based on the provided summary.
    Provide a concise response.

    Summary: {summary}
    Question: {question}
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["summary", "question"])

    # Create the QA chain
    chain = load_qa_chain(llm, chain_type="stuff", prompt=prompt)

    # Run the chain with input data
    input_data = {"input_documents": [summary], "question": question}
    answer = chain.run(input_data)

    return answer
