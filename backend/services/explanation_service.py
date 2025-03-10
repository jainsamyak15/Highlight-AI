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

            # Enhanced prompt for better explanations
            system_prompt = """You are an expert educator skilled at breaking down complex information into clear, understandable explanations. Your explanations are:
            - Simple but not oversimplified
            - Well-structured and logical
            - Rich with relevant examples
            - Free of jargon (or with jargon clearly explained)
            - Engaging and conversational
            - Appropriate for a general audience

            Follow these principles:
            1. Start with a high-level overview
            2. Break down complex concepts
            3. Use analogies when helpful
            4. Connect to familiar concepts
            5. Maintain accuracy while simplifying
            6. Include brief examples
            7. End with a clear summary"""

            user_prompt = f"""Please explain the following text in clear, simple terms that anyone can understand. Break down complex ideas, define any technical terms, and use examples where helpful.

            Text to explain:
            {text}
            
            Guidelines:
            - Use everyday language
            - Break down complex concepts
            - Provide brief examples if needed
            - Maintain accuracy while simplifying
            - End with a one-sentence summary"""

            response = client.chat.completions.create(
                model="mistralai/Mixtral-8x7B-Instruct-v0.1",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error during explanation generation: {e}")
            return "Failed to generate explanation."