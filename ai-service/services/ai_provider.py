"""
AI provider layer.

Primary provider: Groq (OpenAI-compatible API, free tier with generous
rate limits — https://console.groq.com). Set GROQ_API_KEY.

If the API call fails for ANY reason (quota exceeded, rate limited, network
error, invalid key, provider outage, timeout, etc.), every function here
falls back to a deterministic, rule-based result instead of raising an
error — so the product never shows a broken "AI service request failed"
dialog to the user. The response includes a "source" field ("ai" or
"fallback") so the frontend/backend can tell which path was used.
"""

import json
import logging
import os
import re

from openai import OpenAI

logger = logging.getLogger("ai_provider")

_client = None

# Groq exposes an OpenAI-compatible /v1 API, so we reuse the openai SDK
# and just point it at Groq's base_url with a Groq API key.
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in the ai-service environment")
        _client = OpenAI(api_key=api_key, base_url=GROQ_BASE_URL)
    return _client


# --------------------------------------------------------------------------
# Rule-based fallbacks (no external API calls, always succeed instantly)
# --------------------------------------------------------------------------

URGENT_WORDS = {"urgent", "asap", "critical", "immediately", "today", "deadline"}


def _fallback_breakdown(title: str, description: str = "") -> dict:
    text = f"{title} {description}".lower()

    priority = "high" if any(w in text for w in URGENT_WORDS) else "medium"

    # Rough effort estimate from description length; always at least 1 hour.
    word_count = len(re.findall(r"\w+", description or ""))
    estimated_hours = max(1, round(word_count / 40) + 1)

    subtasks = [
        f"Clarify the goal and scope of \"{title}\"",
        "Break the work into smaller pieces",
        "Do the core work",
        "Review and clean up",
        "Mark as complete",
    ]

    return {
        "subtasks": subtasks,
        "suggested_priority": priority,
        "estimated_hours": estimated_hours,
        "source": "fallback",
    }


def _fallback_digest(tasks: list, user_name: str = "there") -> dict:
    if not tasks:
        return {
            "summary": f"Hi {user_name}, you have no pending tasks. You're all caught up!",
            "top_priority_titles": [],
            "source": "fallback",
        }

    high_priority = [t for t in tasks if (t.get("priority") or "").lower() == "high"]
    top_titles = [t["title"] for t in high_priority[:3]] or [t["title"] for t in tasks[:3]]

    summary = (
        f"Hi {user_name}, you have {len(tasks)} pending task(s). "
        f"{len(high_priority)} marked high priority."
    )
    if top_titles:
        summary += " Focus on: " + ", ".join(top_titles) + "."

    return {
        "summary": summary,
        "top_priority_titles": top_titles,
        "source": "fallback",
    }


# --------------------------------------------------------------------------
# Public functions used by main.py
# --------------------------------------------------------------------------


def breakdown_task(title: str, description: str = "") -> dict:
    try:
        client = _get_client()

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

        data = json.loads(response.choices[0].message.content)
        data.setdefault("subtasks", [])
        data.setdefault("suggested_priority", "medium")
        data.setdefault("estimated_hours", None)
        data["source"] = "ai"
        return data

    except Exception as exc:
        logger.warning("AI breakdown failed, using fallback: %s", exc)
        return _fallback_breakdown(title, description)


def generate_digest(tasks: list, user_name: str = "there") -> dict:
    try:
        client = _get_client()

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

        data = json.loads(response.choices[0].message.content)
        data.setdefault("summary", "No tasks pending. You're all caught up!")
        data.setdefault("top_priority_titles", [])
        data["source"] = "ai"
        return data

    except Exception as exc:
        logger.warning("AI digest failed, using fallback: %s", exc)
        return _fallback_digest(tasks, user_name)
