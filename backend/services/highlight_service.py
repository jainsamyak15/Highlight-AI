from utils.supabase_client import supabase
from models.schemas import Highlight

class HighlightService:
    @staticmethod
    async def create_highlight(highlight: Highlight):
        data = highlight.dict()
        result = supabase.table('highlights').insert(data).execute()
        return result.data[0]

    @staticmethod
    async def get_user_highlights(user_id: str):
        result = supabase.table('highlights').select('*').eq('user_id', user_id).execute()
        return result.data