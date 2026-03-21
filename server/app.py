import os
import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
from routes.instruction import router as preference_router
from routes.memory import router as memory_router
from routes.profile import router as profile_router
from routes.tasks import router as tasks_router
from routes.payments import router as payment_router
from routes.integrations import router as integrations_router
from utils.websocket_manager import manager
from pydantic import BaseModel
from groq import Groq

groq_api_key = os.getenv("groq_api_key") or os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key)

class N8NLLMRequest(BaseModel):
    user_rule: str
    website_data: str = ""

load_dotenv()

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    environment=os.getenv("ENVIRONMENT", "development") 
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:5678"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_message(f"Broadcast: {data}")
    except Exception as e:
        sentry_sdk.capture_exception(e)
        print(f"Error: {e}")
    finally:
        manager.disconnect(websocket)


@app.post("/api/n8n-llm")
async def handle_n8n_llm(req: N8NLLMRequest):
    """
    n8n sends raw website data and a user prompt here. 
    The LLM parses the data and decides what to return.
    """
    
    if not req.user_rule:
        return {"response": "SKIP"}

    try:
        clean_data = req.website_data[:12000].strip()
        system_prompt = """
        You are a strict, robotic data-processing engine. 
        Your ONLY job is to evaluate website data against a user's rule.
        
        CRITICAL OUTPUT RULES:
        1. If the user's rule IS MET, output the exact summary or alert message.
        2. If the user's rule IS NOT MET, output the exact word: SKIP
        3. NEVER output conversational filler (e.g., "Here is the summary:", "The price is not met"). 
        4. If the user asks for a general summary (no specific true/false condition), just output the summary.
        """

        user_prompt = f"""
        USER RULE: {req.user_rule}
        
        WEBSITE DATA: 
        {clean_data if clean_data else "No website data provided."}
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=500
        )
        
        final_response = response.choices[0].message.content.strip()
        print(final_response)
        if "SKIP" in final_response.upper() and len(final_response) < 15:
            final_response = "SKIP" 
            
        return {"response": final_response}

    except Exception as e:
        print(e)
        return {"response": "SKIP"}

app.include_router(chat_router)
app.include_router(preference_router)
app.include_router(memory_router)
app.include_router(profile_router)
app.include_router(tasks_router)
app.include_router(payment_router)
app.include_router(integrations_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)