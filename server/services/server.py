from fastapi import FastAPI
from routes.summarizer import router as summarizer_router

app = FastAPI()

app.include_router(summarizer_router)
