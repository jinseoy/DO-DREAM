from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os

from app.document_processor.pdf_parser import PDFParser

router = APIRouter(
    prefix="/document",
    tags=["Document Processor"]
)

@router.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    output_format: str = """
{
    "indexes": ["목차1", "목차2", ...],
    "data": [
        {
            "index": "01",
            "index_title": "챕터 제목",
            "titles": [
                {
                    "title": "섹션 제목",
                    "s_titles": [
                        {
                            "s_title": "소제목",
                            "contents": "내용",
                            "ss_titles": [
                                {
                                    "ss_title": "하위 소제목",
                                    "contents": "내용"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
"""
):
    """PDF 파일을 Gemini로 파싱"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDF 파일만 지원됩니다.")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            parser = PDFParser()
            parsed_data = parser.parse_pdf(temp_path, output_format)
            
            return {
                "filename": file.filename,
                "parsed_data": parsed_data
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))