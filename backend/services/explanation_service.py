import together
import os
from typing import Optional


class ExplanationService:
    async def explain_text(self, text: str) -> str:
        """
        Generate a simplified explanation of the text using Together AI.
        """
        try:
            together.api_key = os.getenv("TOGETHER_API_KEY")
            client = together.Together()

            response = client.chat.completions.create(
                model="mistralai/Mixtral-8x7B-Instruct-v0.1",
                messages=[
                    {"role": "user", "content": f"Please explain this text in simpler terms:\n\n{text}"}
                ]
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error during explanation generation: {e}")
            return "Failed to generate explanation."