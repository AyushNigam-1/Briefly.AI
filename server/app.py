from fastapi import FastAPI , WebSocket
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.instruction import router as preference_router
from routes.memory import router as memory_router
from routes.profile import router as profile_router
from routes.tasks import router as tasks_router
from utils.websocket_manager import manager
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://10.63.43.43:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["Authorization", "Content-Type"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_message(f"Broadcast: {data}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        manager.disconnect(websocket)


# app.include_router(summarizer_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(preference_router)
app.include_router(memory_router)
app.include_router(profile_router)
app.include_router(tasks_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
