from fastapi import FastAPI , WebSocket
from fastapi.middleware.cors import CORSMiddleware
from routes.summarizer import router as summarizer_router
from routes.metadata import router as metadata_router
from routes.query import router as query_router
from routes.auth import router as auth_router
from routes.prompt import router as prompt_router
from middleware.auth_middleware import auth_middleware  
from fastapi import FastAPI, WebSocket
from utils.websocket_manager import manager
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
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



app.include_router(summarizer_router)
app.include_router(metadata_router)
app.include_router(query_router)
app.include_router(auth_router)
app.include_router(prompt_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
