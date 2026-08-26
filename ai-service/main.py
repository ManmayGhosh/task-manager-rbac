from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.openai_service import breakdown_task, generate_digest

load_dotenv()

app = FastAPI(title="Task Manager AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BreakdownRequest(BaseModel):
    title: str
    description: Optional[str] = ""


class TaskSummaryItem(BaseModel):
    title: str
    priority: Optional[str] = None
    status: Optional[str] = None
    dueDate: Optional[str] = None


class DigestRequest(BaseModel):
    tasks: List[TaskSummaryItem] = []
    user_name: Optional[str] = "there"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/breakdown")
def breakdown(req: BreakdownRequest):
    try:
        return breakdown_task(req.title, req.description or "")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI breakdown failed: {exc}")


@app.post("/digest")
def digest(req: DigestRequest):
    try:
        tasks_payload = [t.model_dump() for t in req.tasks]
        return generate_digest(tasks_payload, req.user_name or "there")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI digest failed: {exc}")
