import io
import re
from pypdf import PdfReader
from fastapi import HTTPException

class PDFParserService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        """
        Extracts plain text from raw PDF bytes using pypdf.
        Handles multi-page resumes and cleans excessive whitespace.
        """
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)
            
            if len(reader.pages) == 0:
                raise HTTPException(status_code=400, detail="The PDF contains no pages.")
                
            extracted_pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted_pages.append(text)
            
            full_text = "\n\n".join(extracted_pages).strip()
            
            # Clean up redundant spaces and carriage returns
            full_text = re.sub(r'\r\n|\r', '\n', full_text)
            full_text = re.sub(r'[ \t]+', ' ', full_text)
            full_text = re.sub(r'\n{3,}', '\n\n', full_text)
            
            if len(full_text) < 15:
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract readable text from PDF. It may be scanned or image-only."
                )
                
            return full_text
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse PDF document: {str(e)}"
            )

pdf_parser = PDFParserService()
