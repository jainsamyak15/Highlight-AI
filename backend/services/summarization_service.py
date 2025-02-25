import together
import os
from typing import Optional

class SummarizationService:
    async def summarize_text(self, text: str, max_length: Optional[int] = 200) -> str:
        """
        Summarize the given text using the Together AI API.

        Args:
            text (str): The text to summarize.
            max_length (int, optional): Maximum length of the summary. Defaults to 200.

        Returns:
            str: The generated summary.
        """
        try:
            # Initialize Together client with API key
            together.api_key = os.getenv("TOGETHER_API_KEY")
            client = together.Together()
            response = client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates concise summaries."},
                    {"role": "user", "content": f"Please provide a concise summary of the following text:\n\n{text}"}
                ],
                max_tokens=max_length,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error during summarization: {e}")
            return "Failed to generate summary."