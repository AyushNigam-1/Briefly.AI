from fastapi import APIRouter, HTTPException , Depends , UploadFile , File , Form
from controllers.summary.yt_summary import get_youtube_summary
from controllers.summary.web_summary import get_web_summary
from controllers.summary.file_summary import get_file_summary
from controllers.db.summary import regenerate
import validators
from utils.auth import get_current_user
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from controllers.db.conn import summary_collection
from controllers.db.summary import get_summaries_by_user , get_summary_by_id , delete_summary_by_id
import validators
from urllib.parse import unquote
from controllers.db.conn import fs
from bson import ObjectId


router = APIRouter()

@router.post("/summarize/")
async def summarize_content(
   url: str = Form(None),
    lang: str = Form(None),
    format: str = Form(None),
    title: str = Form(None),
    file: UploadFile = File(None),
    icon:str = Form(None),
    current_user: dict = Depends(get_current_user)
):

    if not url and not file:
        raise HTTPException(status_code=400, detail="Either 'url' or 'file' must be provided.")

    try:
        if url:
            url = unquote(url)
            if not ("youtu.be" in url or "youtube.com" in url or validators.url(url)):
                raise HTTPException(status_code=400, detail="Invalid URL")
            if "youtu.be" in url or "youtube.com" in url:
                summary = await get_youtube_summary(url, lang, format, title,icon, current_user)
            else:
                summary = await get_web_summary(url, lang, format, title, current_user)

        elif file:
            summary = await get_file_summary(file, lang, format, title, current_user)  
        return {"summary": summary}

    except Exception as e:
        print("this error ---------------------->",e)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    
@router.post("/regenerate_summary/")
async def regenerate_summary(
    id: str,
    language: str ,
    format: str ,
):
    try:
        result = await regenerate(id, language, format)
        return  result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    


@router.get("/files")
async def get_file(id: str):
    print(id)
    try:
        object_id = ObjectId(id)
        file_data = fs.find_one({"_id": object_id}) 
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File not found")

        return StreamingResponse(file_data, media_type="application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



