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
            together.api_key = os.getenv("TOGETHER_API_KEY")
            client = together.Together()

            # Enhanced prompt for better summarization
            system_prompt = """You are an expert summarizer with a talent for extracting key information while maintaining context and nuance. Your summaries are:
            - Clear and concise
            - Well-structured
            - Focused on main points
            - Written in an engaging style
            - Preserve important details
            - Maintain the original tone

            Format your summary with:
            - Key points first
            - Supporting details
            - Proper paragraph breaks
            - Clear transitions"""

            user_prompt = f"""Please provide a comprehensive yet concise summary of the following text. Focus on the main ideas, key arguments, and essential details. Maintain the original meaning and tone while making it easily digestible.

Text to summarize:
{text}

Length guideline: Aim for around {max_length} words while ensuring all crucial information is included."""

            response = client.chat.completions.create(
                model="mistralai/Mixtral-8x7B-Instruct-v0.1",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_length,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error during summarization: {e}")
            return "Failed to generate summary."