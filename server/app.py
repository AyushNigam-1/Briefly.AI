from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.summarizer import router as summarizer_router
from routes.metadata import router as metadata_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

app.include_router(summarizer_router)
app.include_router(metadata_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
