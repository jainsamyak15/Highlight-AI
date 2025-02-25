from utils.notion_client import notion
from models.schemas import Highlight
import json

class NotionService:
    @staticmethod
    async def save_to_notion(highlight: Highlight, page_id: str):
        """Save highlight to a Notion page"""
        try:
            new_page = notion.pages.create(
                parent={"database_id": page_id},
                properties={
                    "Title": {
                        "title": [
                            {
                                "text": {
                                    "content": f"Highlight from {highlight.url}"
                                }
                            }
                        ]
                    },
                    "Content": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": highlight.text
                                }
                            }
                        ]
                    },
                    "Summary": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": highlight.summary or ""
                                }
                            }
                        ]
                    },
                    "Source": {
                        "url": highlight.url
                    }
                }
            )
            return new_page
        except Exception as e:
            raise Exception(f"Failed to save to Notion: {str(e)}")
