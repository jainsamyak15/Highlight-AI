from fastapi import FastAPI, HTTPException, Depends
from typing import Optional
from models.schemas import Highlight
from services.highlight_service import HighlightService
from services.notion_service import NotionService
from services.summarization_service import SummarizationService
from fastapi.middleware.cors import CORSMiddleware
import together
import os
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
summarization_service = SummarizationService()


class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 200


class SaveRequest(BaseModel):
    highlight: Highlight
    notion_token: Optional[str] = None


@app.post("/api/summarize")
async def summarize_text(request: SummarizeRequest):
    """
    Summarize the provided text using the Together AI API

    Args:
        request: SummarizeRequest containing text to summarize and optional max_length

    Returns:
        JSON with success status and generated summary
    """
    try:
        summary = await summarization_service.summarize_text(
            text=request.text,
            max_length=request.max_length
        )
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )


@app.post("/api/save")
async def save_highlight(request: SaveRequest):
    """
    Save a highlight to Supabase and optionally to Notion

    Args:
        request: SaveRequest containing highlight data and optional Notion token

    Returns:
        JSON with success status and saved highlight data
    """
    try:
        # Save to Supabase first
        saved_highlight = await HighlightService.create_highlight(request.highlight)

        # If Notion token is provided, save to Notion as well
        if request.notion_token:
            try:
                await NotionService.save_to_notion(
                    highlight=request.highlight,
                    notion_token=request.notion_token
                )
            except Exception as notion_error:
                # Log Notion error but don't fail the whole request
                print(f"Failed to save to Notion: {str(notion_error)}")
                return {
                    "success": True,
                    "highlight": saved_highlight,
                    "notion_status": "failed",
                    "notion_error": str(notion_error)
                }

        return {
            "success": True,
            "highlight": saved_highlight,
            "notion_status": "success" if request.notion_token else "skipped"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save highlight: {str(e)}"
        )


@app.get("/api/health")
async def health_check():
    """
    Simple health check endpoint
    """
    return {"status": "healthy"}