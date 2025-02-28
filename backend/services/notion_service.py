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

            # Log for debugging
            print(f"Saving to Notion with token: {notion_token[:5]}... and page_id: {page_id}")

            # If no page_id is provided, create a new page in the user's workspace
            if not page_id:
                # First, find a database to add the page to
                databases = await NotionService.get_databases(notion_token)
                if not databases:
                    # Create a new database if none exists
                    database_id = await NotionService.create_highlights_database(notion_token)
                    print(f"Created new database with ID: {database_id}")
                else:
                    database_id = databases[0]["id"]
                    print(f"Using existing database with ID: {database_id}")
            else:
                database_id = page_id
                print(f"Using provided database ID: {database_id}")

            # Create the page in the database
            page_data = {
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
                    }
                }
            }

            # Add Content property if it exists in the database
            if highlight.text:
                page_data["properties"]["Content"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": highlight.text[:2000]
                            }
                        }
                    ]
                }

            # Add Summary property if it exists in the database and highlight has a summary
            if highlight.summary:
                page_data["properties"]["Summary"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": highlight.summary[:2000]
                            }
                        }
                    ]
                }

            # Add Source property if it exists in the database and highlight has a URL
            if highlight.url:
                page_data["properties"]["Source"] = {
                    "url": highlight.url
                }

            print(f"Creating page with data: {json.dumps(page_data)[:200]}...")
            response = requests.post(
                "https://api.notion.com/v1/pages",
                headers=headers,
                json=page_data
            )

            print(f"Notion create page response: {response.status_code}")
            if response.status_code != 200:
                print(f"Notion error response: {response.text}")
                raise Exception(f"Failed to create page: {response.text}")

            return response.json()
        except Exception as e:
            print(f"Error in save_to_notion: {str(e)}")
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

            print(f"Getting Notion pages with token: {notion_token[:5]}...")

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

            print(f"Notion search response: {response.status_code}")
            if response.status_code != 200:
                print(f"Notion error response: {response.text}")
                raise Exception(f"Failed to search databases: {response.text}")

            data = response.json()
            print(f"Found {len(data.get('results', []))} databases")

            # Format the results
            pages = []
            for result in data.get("results", []):
                title = ""
                if "title" in result:
                    for title_item in result.get("title", []):
                        if "plain_text" in title_item:
                            title += title_item["plain_text"]
                elif "properties" in result and "title" in result["properties"]:
                    title_property = result["properties"]["title"]
                    if "title" in title_property:
                        for title_item in title_property["title"]:
                            if "plain_text" in title_item:
                                title += title_item["plain_text"]

                pages.append({
                    "id": result["id"],
                    "title": title or "Untitled Database"
                })

            return pages
        except Exception as e:
            print(f"Error in get_pages: {str(e)}")
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

            parent_page_id = search_data["results"][0]["id"]
            print(f"Using parent page ID: {parent_page_id}")


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

            print(f"Create database response: {response.status_code}")
            if response.status_code != 200:
                print(f"Create database error: {response.text}")
                raise Exception(f"Failed to create database: {response.text}")

            data = response.json()
            return data["id"]

        except Exception as e:
            print(f"Error in create_highlights_database: {str(e)}")
            raise Exception(f"Failed to create highlights database: {str(e)}")