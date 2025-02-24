import os
import together
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# Ensure the API key is set
if not os.getenv("TOGETHER_API_KEY"):
    raise ValueError("TOGETHER_API_KEY is missing. Please check your .env file.")

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
            prompt = f"""Please provide a concise summary of the following text. Focus on the key points and main ideas:

Text: {text}

Summary:"""

            response = together.Complete.create(
                prompt=prompt,
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                max_tokens=max_length,
                temperature=0.7,
                top_p=0.7,
                top_k=50,
                repetition_penalty=1.1
            )

            # Check if response contains expected fields
            if "output" in response and isinstance(response["output"], dict) and "content" in response["output"]:
                return response["output"]["content"].strip()
            else:
                raise ValueError(f"Unexpected API response: {response}")

        except Exception as e:
            print(f"Error during summarization: {e}")
            return "Failed to generate summary."

    async def batch_summarize(self, texts: list[str], max_length: Optional[int] = 200) -> list[str]:
        """
        Summarize multiple texts in batch.

        Args:
            texts (list[str]): List of texts to summarize.
            max_length (int, optional): Maximum length for each summary. Defaults to 200.

        Returns:
            list[str]: List of generated summaries.
        """
        return [await self.summarize_text(text, max_length) for text in texts]
