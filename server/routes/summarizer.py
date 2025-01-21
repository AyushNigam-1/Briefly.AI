from fastapi import APIRouter, HTTPException , Depends , UploadFile , File
from controllers.summary.yt_summary import get_youtube_summary
from controllers.summary.web_summary import get_web_summary
from controllers.summary.file_summary import get_file_summary
import validators
from utils.auth import get_current_user
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from typing import Any, Dict
from controllers.db.conn import summary_collection
from controllers.db.summary import get_summaries_by_user , get_summary_by_id , delete_summary_by_id
router = APIRouter()

@router.get("/summarize/")
async def summarize_content(url: str,lang:str,format:str,title:str , current_user: dict = Depends(get_current_user)):
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        if "youtu.be" in url or "youtube.com" in url:
            summary = await get_youtube_summary(url,lang,format,title,current_user)
        else:
            summary = await get_web_summary(url,lang,format,title,current_user)
            
        return {"summary":summary,}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    


@router.get("/download/")
async def download_summary(summary_id: str, type: str):
    if type not in ["original_summary", "summarized_summary"]:
        raise HTTPException(status_code=400, detail="Invalid type parameter. Must be 'original_summary' or 'summarized_summary'.")

    summary = summary_collection.find_one({"_id": ObjectId(summary_id)})

    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found.")

    summary_content = summary.get(type)
    if not summary_content:
        raise HTTPException(status_code=404, detail=f"{type} not available for the given summary.")

    file_name = f"{type}_{summary_id}.txt"

    summary_file = BytesIO(summary_content.encode("utf-8"))

    return StreamingResponse(
        summary_file,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={file_name}"}
    )



@router.get("/user_summaries/")
def get_user_summaries(current_user: dict = Depends(get_current_user)):
    try:
        summaries = get_summaries_by_user(current_user["user_id"])
        
        return {"summaries": summaries}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    


@router.get("/summary/")
def get_summary(id: str):
    """
    Retrieve a summary by its ID for the current user.
    """
    try:
        summary = get_summary_by_id(id)
        if isinstance(summary, str):
            raise HTTPException(status_code=400, detail=summary)
        
        return {"summary": summary}
    
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        # Handle unexpected errors
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    


@router.delete("/summary/")
async def delete_summary(id: str):
    """
    Deletes a summary by its ID for the current user.
    """
    print(id)
    try:
        result = delete_summary_by_id(id)
        if "Invalid" in result:
            raise HTTPException(status_code=400, detail=result)
        elif "not found" in result:
            raise HTTPException(status_code=404, detail=result)

        return {"message": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    

    
@router.post('/summarize-file')
async def extract_text(file: UploadFile = File(...)):
    try:
        extracted_text = get_file_summary(file)
        return {"extracted_text": extracted_text}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

