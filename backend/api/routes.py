from fastapi import FastAPI, HTTPException, Depends
from typing import Optional
from models.schemas import Highlight
from services.highlight_service import HealthService, HighlightService
from services.notion_service import NotionService
from services.summarization_service import SummarizationService
from services.explanation_service import ExplanationService
from services.health_service import HealthService
from fastapi.middleware.cors import CORSMiddleware
import together
import os
from pydantic import BaseModel
import requests
import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarization_service = SummarizationService()
explanation_service = ExplanationService()
health_service = HealthService()

# Start the keep-alive task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(health_service.keep_alive())

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

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint that returns the application status
    """
    return await health_service.health_check()

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

        # Log the request for debugging
        print(f"Exchanging token with: code={request.code}, redirect_uri={redirect_uri}")
        print(f"Using client_id: {client_id}")
        print(f"Using client_secret: {client_secret[:4]}...")  # Only log first few chars for security

        # Basic auth is required for Notion OAuth
        auth = (client_id, client_secret)

        response = requests.post(
            "https://api.notion.com/v1/oauth/token",
            auth=auth,
            json={
                "grant_type": "authorization_code",
                "code": request.code,
                "redirect_uri": redirect_uri
            },
            headers={
                "Content-Type": "application/json"
            }
        )

        # Log the response for debugging
        print(f"Notion response status: {response.status_code}")
        print(f"Notion response: {response.text}")

        if response.status_code != 200:
            error_detail = f"Failed to exchange token: {response.text}"
            raise HTTPException(status_code=400, detail=error_detail)

        return response.json()
    except Exception as e:
        print(f"Error in exchange_notion_token: {str(e)}")
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