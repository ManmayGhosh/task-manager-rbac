import json
import os
from openai import OpenAI

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set in the ai-service environment")
        _client = OpenAI(api_key=api_key)
    return _client


MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def breakdown_task(title: str, description: str = "") -> dict:
    """Ask the model to break a task into actionable subtasks with a
    suggested priority and rough effort estimate. Returns strict JSON."""
    client = get_client()

    system_prompt = (
        "You are a project-management assistant embedded in a task manager app. "
        "Given a task title and optional description, respond ONLY with a JSON object "
        "with this exact shape:\n"
        "{\n"
        '  "subtasks": ["short actionable subtask", ...],  // 3-6 items\n'
        '  "suggested_priority": "low" | "medium" | "high",\n'
        '  "estimated_hours": number\n'
        "}\n"
        "No markdown, no commentary, only the JSON object."
    )

    user_prompt = f"Task title: {title}\nDescription: {description or 'N/A'}"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    data = json.loads(content)

    data.setdefault("subtasks", [])
    data.setdefault("suggested_priority", "medium")
    data.setdefault("estimated_hours", None)
    return data


def generate_digest(tasks: list, user_name: str = "there") -> dict:
    """Generate a short natural-language daily digest summarizing a user's
    pending tasks, called for the dashboard."""
    client = get_client()

    system_prompt = (
        "You are a friendly, concise productivity assistant. Given a JSON list of a "
        "user's pending tasks (title, priority, status, dueDate), write a short "
        "daily digest (3-5 sentences) highlighting what's most urgent and any "
        "overdue or high priority items. Respond ONLY with a JSON object of shape:\n"
        '{ "summary": "text", "top_priority_titles": ["...", "..."] }'
    )

    user_prompt = f"User: {user_name}\nTasks: {json.dumps(tasks, default=str)}"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    data = json.loads(content)
    data.setdefault("summary", "No tasks pending. You're all caught up!")
    data.setdefault("top_priority_titles", [])
    return data
