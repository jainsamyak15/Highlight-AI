from fastapi import FastAPI, HTTPException, Depends
from typing import Optional
from models.schemas import Highlight
from services.highlight_service import HighlightService
from services.notion_service import NotionService
from services.summarization_service import SummarizationService
from services.explanation_service import ExplanationService
from fastapi.middleware.cors import CORSMiddleware
import together
import os
from pydantic import BaseModel
import requests

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarization_service = SummarizationService()
explanation_service = ExplanationService()


class NotionTokenExchange(BaseModel):
    code: str
    redirectUri: Optional[str] = None


class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 200


class ExplainRequest(BaseModel):
    text: str


class SaveRequest(BaseModel):
    highlight: Highlight
    notion_token: Optional[str] = None
    notion_page_id: Optional[str] = None


@app.post("/api/notion/exchange-token")
async def exchange_notion_token(request: NotionTokenExchange):
    """
    Exchange Notion OAuth code for access token
    """
    try:
        client_id = os.getenv("NOTION_CLIENT_ID")
        client_secret = os.getenv("NOTION_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="Notion credentials not configured")

        redirect_uri = request.redirectUri or os.getenv("NOTION_REDIRECT_URI")

        response = requests.post(
            "https://api.notion.com/v1/oauth/token",
            json={
                "grant_type": "authorization_code",
                "code": request.code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret
            },
            headers={
                "Content-Type": "application/json"
            }
        )

        if response.status_code != 200:
            error_detail = f"Failed to exchange token: {response.text}"
            raise HTTPException(status_code=400, detail=error_detail)

        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summarize")
async def summarize_text(request: SummarizeRequest):
    """
    Summarize the provided text using the Together AI API
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


@app.post("/api/explain")
async def explain_text(request: ExplainRequest):
    """
    Generate a simplified explanation of the text
    """
    try:
        explanation = await explanation_service.explain_text(request.text)
        return {
            "success": True,
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate explanation: {str(e)}"
        )


@app.post("/api/save")
async def save_highlight(request: SaveRequest):
    """
    Save a highlight to Supabase and optionally to Notion
    """
    try:
        saved_highlight = await HighlightService.create_highlight(request.highlight)

        if request.notion_token:
            try:
                await NotionService.save_to_notion(
                    highlight=request.highlight,
                    notion_token=request.notion_token,
                    page_id=request.notion_page_id
                )
            except Exception as notion_error:
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


@app.get("/api/notion/pages")
async def get_notion_pages(notion_token: str):
    """
    Get list of available Notion pages
    """
    try:
        pages = await NotionService.get_pages(notion_token)
        return {
            "success": True,
            "pages": pages
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch Notion pages: {str(e)}"
        )


@app.get("/api/health")
async def health_check():
    """
    Simple health check endpoint
    """
    return {"status": "healthy"}