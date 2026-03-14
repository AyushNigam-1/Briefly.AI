import os
import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
# from routes.auth import router as auth_router
from routes.instruction import router as preference_router
from routes.memory import router as memory_router
from routes.profile import router as profile_router
from routes.tasks import router as tasks_router
from routes.payments import router as payment_router
from routes.integrations import router as integrations_router
from utils.websocket_manager import manager

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
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0
    return {"message": "You will never see this"}

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

# Include Routers
app.include_router(chat_router)
# app.include_router(auth_router)
app.include_router(preference_router)
app.include_router(memory_router)
app.include_router(profile_router)
app.include_router(tasks_router)
app.include_router(payment_router)
app.include_router(integrations_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)