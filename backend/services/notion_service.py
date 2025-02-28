from models.schemas import Highlight
import json
import requests
from typing import List, Dict, Any, Optional


class NotionService:
    @staticmethod
    async def save_to_notion(highlight: Highlight, notion_token: str, page_id: Optional[str] = None):
        """Save highlight to a Notion page"""
        try:
            headers = {
                "Authorization": f"Bearer {notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            }

            # If no page_id is provided, create a new page in the user's workspace
            if not page_id:
                # First, find a database to add the page to
                databases = await NotionService.get_databases(notion_token)
                if not databases:
                    # Create a new database if none exists
                    database_id = await NotionService.create_highlights_database(notion_token)
                else:
                    database_id = databases[0]["id"]
            else:
                database_id = page_id

            # Create the page in the database
            response = requests.post(
                "https://api.notion.com/v1/pages",
                headers=headers,
                json={
                    "parent": {"database_id": database_id},
                    "properties": {
                        "Title": {
                            "title": [
                                {
                                    "text": {
                                        "content": f"Highlight from {highlight.url or 'unknown source'}"
                                    }
                                }
                            ]
                        },
                        "Content": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": highlight.text[:2000] if highlight.text else ""
                                    }
                                }
                            ]
                        },
                        "Summary": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": highlight.summary[:2000] if highlight.summary else ""
                                    }
                                }
                            ]
                        },
                        "Source": {
                            "url": highlight.url or ""
                        }
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"Failed to create page: {response.text}")

            return response.json()
        except Exception as e:
            raise Exception(f"Failed to save to Notion: {str(e)}")

    @staticmethod
    async def get_pages(notion_token: str) -> List[Dict[str, Any]]:
        """Get list of available Notion pages (databases)"""
        try:
            headers = {
                "Authorization": f"Bearer {notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            }

            # First get databases the integration has access to
            response = requests.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={
                    "filter": {
                        "value": "database",
                        "property": "object"
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"Failed to search databases: {response.text}")

            data = response.json()

            # Format the results
            pages = []
            for result in data.get("results", []):
                title = ""
                for title_item in result.get("title", []):
                    if "plain_text" in title_item:
                        title += title_item["plain_text"]

                pages.append({
                    "id": result["id"],
                    "title": title or "Untitled Database"
                })

            return pages
        except Exception as e:
            raise Exception(f"Failed to get Notion pages: {str(e)}")

    @staticmethod
    async def get_databases(notion_token: str) -> List[Dict[str, Any]]:
        """Get list of databases the integration has access to"""
        try:
            headers = {
                "Authorization": f"Bearer {notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            }

            response = requests.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={
                    "filter": {
                        "value": "database",
                        "property": "object"
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"Failed to search databases: {response.text}")

            data = response.json()
            return data.get("results", [])
        except Exception as e:
            raise Exception(f"Failed to get Notion databases: {str(e)}")

    @staticmethod
    async def create_highlights_database(notion_token: str) -> str:
        """Create a new database for highlights"""
        try:
            headers = {
                "Authorization": f"Bearer {notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            }

            # First, get the user's workspace
            search_response = requests.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={"page_size": 1}
            )

            if search_response.status_code != 200:
                raise Exception(f"Failed to search workspace: {search_response.text}")

            search_data = search_response.json()
            if not search_data.get("results"):
                raise Exception("No pages found in workspace")

            # Get the first page to use as parent
            parent_page_id = search_data["results"][0]["id"]

            # Create the database
            response = requests.post(
                "https://api.notion.com/v1/databases",
                headers=headers,
                json={
                    "parent": {
                        "type": "page_id",
                        "page_id": parent_page_id
                    },
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "Highlight.ai Highlights"
                            }
                        }
                    ],
                    "properties": {
                        "Title": {
                            "title": {}
                        },
                        "Content": {
                            "rich_text": {}
                        },
                        "Summary": {
                            "rich_text": {}
                        },
                        "Source": {
                            "url": {}
                        }
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"Failed to create database: {response.text}")

            data = response.json()
            return data["id"]
        except Exception as e:
            raise Exception(f"Failed to create highlights database: {str(e)}")