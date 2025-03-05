import uvicorn
from fastapi import FastAPI
from api.routes import app
import os

if __name__ == "__main__":
    # Get port from environment variable or default to 8000
    port = int(os.environ.get("PORT", 8000))

    # Configure uvicorn with production settings
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        workers=4,  # Multiple workers for better reliability
        loop="auto",  # Auto-select the best event loop
        log_level="info",
        access_log=True,
        timeout_keep_alive=65,  # Increased keep-alive timeout
        proxy_headers=True  # Trust proxy headers for proper IP handling
    )