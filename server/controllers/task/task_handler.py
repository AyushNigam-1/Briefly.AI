# controllers/task/task_handler.py
import os
import json
import traceback
from datetime import datetime, timezone
from bson import ObjectId

# DB
from controllers.db.conn import summary_collection

# GROQ INTEGRATION
from langchain_groq import ChatGroq  # <--- CHANGED FROM ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from agent.n8n_tools import create_automation_workflow

# ---------------------------------------------------------
# SYSTEM PROMPT
# ---------------------------------------------------------
TASK_ARCHITECT_PROMPT = """
You are an expert Automation Architect for n8n.
CRITICAL: Use the EXACT key name "args" for tool parameters. Do NOT use "params".

AVAILABLE TOOLS:
1. `add_schedule(hour, minute)` - Args: hour (int), minute (int)
2. `add_http_get(url, name)` - Args: url (str), name (str)
3. `add_logger(message, branch)` - Args: message (str), branch (int: 0=True, 1=False)
4. `add_wait(amount, unit, branch)` - Args: amount (int), unit (str), branch (int)
5. `add_edit_fields(assignments)` - Args: assignments (dict: {"new_name": "value_or_expression"})
6. `add_if_condition(value1, operation, value2, data_type)` - Args: value1 (str), operation (str), value2 (any), data_type (str)

STRICT RULES:
- EXPRESSIONS: Use n8n dot notation: {{$json.field_name}} or {{$json.parent.child}}.
- BRANCHING: Every tool after an `add_if_condition` MUST include a "branch" key (0 for True path, 1 for False path).
- LOGIC: The "branch" 0 is the default. Only use "branch": 1 for nodes explicitly on the False path.

OUTPUT FORMAT:
Return ONLY raw JSON. No markdown formatting.
{
  "steps": [
    { "tool": "add_schedule", "args": { "hour": 8, "minute": 0 } },
    { "tool": "add_http_get", "args": { "url": "https://api.com", "name": "API" } },
    { "tool": "add_if_condition", "args": { "value1": "{{$json.price}}", "operation": "lt", "value2": 50 } },
    { "tool": "add_logger", "args": { "message": "Low!" }, "branch": 0 },
    { "tool": "add_logger", "args": { "message": "High!" }, "branch": 1 }
  ]
}
"""

async def perform_task(user_input: str, user_id: str, chat_id: str = None):
    print("---- TASK MODE START (GROQ) ----")
    
    try:
        # 1. Initialize Chat/Task Session
        if chat_id and ObjectId.is_valid(chat_id):
            object_id = ObjectId(chat_id)
        else:
            new_chat = {
                "user_id": user_id,
                "queries": [],
                "timestamp": datetime.now(timezone.utc),
                "title": "New Automation Task",
                "mode": "task" 
            }
            res = summary_collection.insert_one(new_chat)
            object_id = res.inserted_id

        # ---------------------------------------------------------
        # 2. AI ARCHITECT (Using Groq)
        # ---------------------------------------------------------
        
        # Initialize Groq LLM
        # "llama3-70b-8192" is currently the best Groq model for complex instruction following
        llm = ChatGroq(
            temperature=0,
            model_name="openai/gpt-oss-120b", 
            api_key=os.getenv("groq_api_key")
        )

        print("🤖 Architect is thinking...")
        
        # Invoke the model
        plan_response = await llm.ainvoke([
            SystemMessage(content=TASK_ARCHITECT_PROMPT),
            HumanMessage(content=user_input)
        ])
        
        # Clean the output (Groq is fast but sometimes adds backticks)
        raw_plan = plan_response.content.strip()
        if raw_plan.startswith("```"):
            raw_plan = raw_plan.replace("```json", "").replace("```", "")
            
        print(f"📋 Plan: {raw_plan}")

        # ---------------------------------------------------------
        # 3. EXECUTION (Build the Bot)
        # ---------------------------------------------------------
        build_response = create_automation_workflow(user_intent=user_input, config=raw_plan)
        build_data = json.loads(build_response)
        
        # 4. Formulate Response
        if build_data.get("status") == "success":
            response_text = f"✅ **Task Completed:** Workflow created (ID: `{build_data.get('id')}`). It is now active."
        else:
            response_text = f"❌ **Task Failed:** {build_data.get('message')}"

        # 5. Save to DB
        summary_collection.update_one(
            {"_id": object_id},
            {
                "$push": {
                    "queries": {
                        "$each": [
                            {"sender": "user", "content": user_input, "mode": "task"},
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
            "title": "Automation Task",
            "mode": "task"
        }

    except Exception as e:
        traceback.print_exc()
        return {"res": "System Error", "error": str(e)}