from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Highlight(BaseModel):
    text: str
    summary: Optional[str] = None
    url: Optional[str] = None
    user_id: str
    created_at: datetime = datetime.utcnow()