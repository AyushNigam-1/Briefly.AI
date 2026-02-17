import os
import json
import traceback
from datetime import datetime, timezone
from bson import ObjectId
from controllers.mongo import summary_collection , workflows_collection
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from agent.tools.n8n_tools import create_automation_workflow
import requests

N8N_HOST = "http://localhost:5678"
N8N_API_KEY = os.getenv("N8N_API_KEY")

# ---------------------------------------------------------
# SYSTEM PROMPT
# ---------------------------------------------------------
TASK_ARCHITECT_PROMPT = """
You are an expert Automation Architect for n8n.
CRITICAL:
- Return output in TWO parts ONLY:
  1. workflow_name (short, max 3–5 words)
  2. steps (JSON array)

- Use the EXACT key name "args" for tool parameters.
- Do NOT use "params".
- Return ONLY raw JSON. No markdown.

FORMAT MUST BE:

{
  "workflow_name": "Short Name",
  "steps": [ ... ]
}

AVAILABLE TOOLS:

1. add_schedule(hour, minute)
   Args:
   - hour (int)
   - minute (int)

2. add_http_get(url, name)
   Args:
   - url (str)
   - name (str)

3. add_edit_fields(assignments)
   Args:
   - assignments (dict)
   Example:
     {"price": "{{$json.bitcoin.usd}}"}

4. add_if_condition(value1, operation, value2, data_type)
   Args:
   - value1 (str)
   - operation (str: lt, gt, eq, etc.)
   - value2 (number or string)
   - data_type (str: "number" or "string")

5. add_wait(amount, unit)
   Args:
   - amount (int)
   - unit (str: "seconds", "minutes", "hours")

6. add_logger(message)
   Args:
   - message (str)
   Must include "branch" after IF (0 = true path, 1 = false path)

7. add_webhook_notify(url, message)
   Args:
   - url (str)
   - message (str)
   Must include "branch" after IF

8. add_loop_back()
   No args required.
   Creates a loop from the last node back to the most recent HTTP node.
   Used for monitoring workflows.

--------------------------------------------------

STRICT RULES:

- EXPRESSIONS:
  Use n8n dot notation only.
  Example: {{$json.bitcoin.usd}}

- BRANCHING:
  After an add_if_condition:
  - All TRUE path nodes MUST include "branch": 0
  - All FALSE path nodes MUST include "branch": 1

- LOOPING:
  add_loop_back() MUST only be used after add_wait()
  to create monitoring loops.

- LOGIC:
  Branch 0 = True path
  Branch 1 = False path

--------------------------------------------------

OUTPUT FORMAT:

Return ONLY raw JSON.

Example:

{
  "steps": [
    { "tool": "add_schedule", "args": { "hour": 8, "minute": 0 } },
    { "tool": "add_http_get", "args": { "url": "https://api.com", "name": "API" } },
    { "tool": "add_if_condition", "args": { "value1": "{{$json.price}}", "operation": "lt", "value2": 50, "data_type": "number" } },
    { "tool": "add_logger", "args": { "message": "Low!" }, "branch": 0 },
    { "tool": "add_logger", "args": { "message": "High!" }, "branch": 1 }
  ]
}

"""

async def perform_task(user_input: str, user_id: str, chat_id: str = None):
    print("---- TASK MODE START (GROQ) ----")

    try:
        # Chat session
        if chat_id and ObjectId.is_valid(chat_id):
            object_id = ObjectId(chat_id)
        else:
            res = summary_collection.insert_one({
                "user_id": user_id,
                "queries": [],
                "timestamp": datetime.now(timezone.utc),
                "title": "Automation Task",
                "mode": "task"
            })
            object_id = res.inserted_id

        llm = ChatGroq(
            temperature=0,
            model_name="openai/gpt-oss-120b",
            api_key=os.getenv("groq_api_key")
        )

        print("🤖 Architect is thinking...")

        plan_response = await llm.ainvoke([
            SystemMessage(content=TASK_ARCHITECT_PROMPT),
            HumanMessage(content=user_input)
        ])

        raw = plan_response.content.strip()

        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "")

        architect_output = json.loads(raw)

        workflow_name = architect_output["workflow_name"]
        steps = architect_output["steps"]

        print("Workflow Name:", workflow_name)
        print("Steps:", steps)

        # Build workflow
        build_response = create_automation_workflow(
            user_intent=workflow_name,
            config=json.dumps({"steps": steps})
        )

        build_data = json.loads(build_response)
        if build_data.get("status") == "success":
             wf_id = build_data.get("id")
             workflows_collection.insert_one({
                "user_id": user_id,
                "workflow_id": wf_id,
                "workflow_name": workflow_name,
                "prompt": user_input,
                "created_at": datetime.now(timezone.utc),
                "is_active": True
                })
             response_text = f"✅ Workflow '{workflow_name}' created."
        else:
            response_text = f"❌ Failed: {build_data.get('message')}"

        summary_collection.update_one(
            {"_id": object_id},
            {
                "$push": {
                    "queries": {
                        "$each": [
                            {"sender": "user", "content": user_input},
                            {"sender": "llm", "content": response_text, "technical_details": build_data}
                        ]
                    }
                },
                "$set": {"timestamp": datetime.now(timezone.utc)}
            }
        )

        return {
            "id": str(object_id),
            "res": response_text,
            "workflow": workflow_name,
            "mode": "task"
        }

    except Exception as e:
        traceback.print_exc()
        return {"res": "System Error", "error": str(e)}

def get_user_workflows(user_id: str):
    """
    Returns all workflows created by this user.
    """
    workflows = list(
        workflows_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
    )

    return workflows

def delete_workflow(user_id: str, workflow_id: str):
    """
    Deletes workflow from n8n and DB (only if owned by user).
    """

    # Verify ownership
    wf = workflows_collection.find_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    if not wf:
        return {"status": "error", "message": "Workflow not found or not owned by user"}

    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }

    # Delete from n8n
    res = requests.delete(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": f"n8n delete failed: {res.text}"
        }

    # Delete from Mongo
    workflows_collection.delete_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    return {"status": "success", "message": "Workflow deleted"}

def execute_workflow(user_id: str, workflow_id: str):
    """
    Manually executes workflow (only if owned by user).
    """

    # Ownership check
    wf = workflows_collection.find_one({
        "workflow_id": workflow_id,
        "user_id": user_id
    })

    if not wf:
        return {"status": "error", "message": "Workflow not found or not owned by user"}

    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }

    res = requests.post(
        f"{N8N_HOST}/api/v1/workflows/{workflow_id}/execute",
        headers=headers
    )

    if not res.ok:
        return {
            "status": "error",
            "message": res.text
        }

    return {"status": "success", "message": "Workflow executed"}
