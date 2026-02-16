# agent/tools.py
from utils.n8n import N8nLegoBuilder
import json

def create_automation_workflow(user_intent: str, config: str):
    try:
        plan = json.loads(config)
        steps = plan.get("steps", [])
        builder = N8nLegoBuilder(workflow_name=user_intent)
        
        for step in steps:
            tool_name = step.get("tool")
            # The AI might put 'branch' in 'step' OR inside 'args'
            args = step.get("args", {})
            
            # --- ROBUST BRANCH EXTRACTION ---
            raw_branch = step.get("branch")
            if raw_branch is None:
                raw_branch = args.get("branch", 0) # Check inside args!

            # Convert any format (string "1", bool True, etc) to int 0 or 1
            # if str(raw_branch).lower() in ["false", "1", "branch 1"]:
            #     branch_idx = 1
            # else:
            #     branch_idx = 0
            raw_branch = step.get("branch")
            if raw_branch is None:
                raw_branch = args.get("branch", 0)

            # Normalize to integer 0 or 1
            branch_idx = 0
            try:
                # numeric (int or numeric string)
                branch_idx = int(raw_branch)
                branch_idx = 1 if branch_idx == 1 else 0
            except (ValueError, TypeError):
                s = str(raw_branch).strip().lower()
                if s in ("1", "true", "branch 1"):
                    branch_idx = 1
                else:
                    branch_idx = 0

            # --- DEBUG PRINT ---
            # This will help you see if the branch is being caught correctly
            print(f"DEBUG: Processing {tool_name} on Branch {branch_idx}")

            if tool_name == "add_schedule":
                builder.add_schedule(hour=args.get("hour"), minute=args.get("minute"))
            elif tool_name == "add_http_get":
                builder.add_http_get(url=args.get("url"), node_name=args.get("name"))
            elif tool_name == "add_edit_fields":
                builder.add_edit_fields(assignments=args.get("assignments"))
            elif tool_name == "add_if_condition":
                builder.add_if_condition(
                    value1=args.get("value1"),
                    operation=args.get("operation"),
                    value2=args.get("value2"),
                    data_type=args.get("data_type", "number")
                )
            elif tool_name == "add_wait":
                builder.add_wait(amount=args.get("amount"), unit=args.get("unit"))
            elif tool_name == "add_logger":
                builder.add_logger(message=args.get("message"), branch=branch_idx)
                
        return json.dumps(builder.deploy())
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# # --- MOCK TEST (Run this file directly to test) ---
# if __name__ == "__main__":
#     # This simulates what the LLM would output
#     mock_llm_json = """
#     {
#         "steps": [
#             { "tool": "add_schedule", "args": { "hour": 5, "minute": 0 } },
#             { "tool": "add_http_get", "args": { "url": "https://stoic.tekloon.net/stoic-quote", "name": "Get Quote" } },
#             { "tool": "add_logger", "args": { "message": "Quote received successfully" } }
#         ]
#     }
#     """
    
#     print("🤖 AI Agent calling tool...")
#     response = create_automation_workflow("Daily Stoic Bot", mock_llm_json)
#     print("✅ Result:", response)