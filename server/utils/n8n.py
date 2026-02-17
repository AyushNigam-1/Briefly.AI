import requests
import uuid
import os
from dotenv import load_dotenv
load_dotenv()

# --- CONFIGURATION ---
# In a real app, load these from os.getenv()
N8N_HOST = "http://localhost:5678"
N8N_API_KEY = os.getenv("N8N_API_KEY")  # <--- PASTE YOUR KEY

class N8nLegoBuilder:
    def __init__(self, workflow_name):
        self.name = workflow_name
        self.nodes = []
        self.connections = {}
        self.last_node_name = None
        self.if_node_anchor = None 
        self.x_pos = 400 
        self.y_pos = 300

    def _add_node(self, node_template, branch_index=0):
        # 1. Create a truly unique name to prevent n8n collision errors
        unique_name = f"{node_template['name']}-{uuid.uuid4().hex[:4]}"
        node_template["name"] = unique_name
        node_template["id"] = str(uuid.uuid4())
        
        # 2. Strategic UI Positioning
        # Push Branch 1 (False) nodes 250 pixels lower to avoid overlap
        # current_y = self.y_pos + (250 if branch_index == 1 else 0)
        current_y = self.y_pos + (250 * (branch_index + 1))

        node_template["position"] = [self.x_pos, current_y]
        
        self.nodes.append(node_template)

        # 3. Handle Connections
        source_node = self.if_node_anchor if (branch_index == 1 and self.if_node_anchor) else self.last_node_name

        if source_node:
            # Initialize connection structure if it doesn't exist
            if source_node not in self.connections:
                # n8n expects: "node_name": { "main": [ [Output0_Connections], [Output1_Connections] ] }
                self.connections[source_node] = {"main": [[]]}

            # Ensure the specific branch (0 or 1) has an array ready
            while len(self.connections[source_node]["main"]) <= branch_index:
                self.connections[source_node]["main"].append([])

            # Add the wire to the specific output index
            self.connections[source_node]["main"][branch_index].append({
                "node": unique_name,
                "type": "main",
                "index": 0 # This is the INPUT index of the new node (always 0)
            })
            
        # 4. State Management
        # IMPORTANT: We only update the 'linear' last_node_name if we are on the main path (Branch 0)
        # This keeps Branch 1 nodes from "hijacking" the chain.
        if branch_index == 0:
            self.last_node_name = unique_name
            self.x_pos += 250 # Move right for the next node
        
        return unique_name
# --- LEGO BLOCK 4: IF CONDITION (FIXED ANCHOR) ---
    def add_if_condition(self, value1, operation, value2, data_type="number"):
        print("🧱 Adding Block: IF Condition")

        node = {
            "parameters": {
                "conditions": {
                    data_type: [
                        {
                            "value1": value1,
                            "operation": operation,
                            "value2": value2
                        }
                    ]
                }
            },
            "name": "IF Condition",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2
        }

        self._add_node(node)
        return self


    # --- LEGO BLOCK 1: SCHEDULE ---
    def add_schedule(self, hour=9, minute=0):
        print(f"🧱 Adding Block: Schedule ({hour}:{minute:02d})")
        node = {
            "parameters": {
                "rule": {
                    "interval": [{
                        "field": "cronExpression",
                        "expression": f"{minute} {hour} * * *"
                    }]
                }
            },
            "name": "Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.1
        }
        self._add_node(node)
        return self

    # --- LEGO BLOCK 2: HTTP REQUEST ---
    def add_http_get(self, url, node_name="Fetch Data"):
        print(f"🧱 Adding Block: HTTP GET ({url})")
        node = {
            "parameters": {
                "url": url,
                "method": "GET"
            },
            "name": node_name,
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 3
        }

        name = self._add_node(node)

        # Save for loop target
        self.last_http_node = name

        return self

    def add_webhook_notify(self, url, message, branch=0):
        print("🧱 Adding Webhook Notify")

        node = {
            "parameters": {
                "url": url,
                "method": "POST",
                "jsonParameters": True,
                "bodyParametersJson": f'{{"text": "{message}"}}'
            },
            "name": "Webhook Notify",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 3
        }

        self._add_node(node, branch_index=branch)
        return self

    
    def add_loop_back(self, target_node_name):
        """
        Creates a loop from the last node back to target_node_name
        """
        print(f"🧱 Adding Loop Back to {target_node_name}")

        source = self.last_node_name

        if source not in self.connections:
            self.connections[source] = {"main": [[]]}

        self.connections[source]["main"][0].append({
            "node": target_node_name,
            "type": "main",
            "index": 0
        })

    # --- LEGO BLOCK 3: DISCORD / LOG ---
    # (Using a Code node to simulate a message for now)
    # Updated Logger to support branches
    def add_logger(self, message, branch=0): 
        """
        branch=0 for True, branch=1 for False.
        """
        print(f"🧱 Adding Block: Logger (Branch {branch})")
        # Generates a JS code block to log the output
        js_code = f"console.log('{message}');\nreturn $input.all();"
        node = {
            "parameters": { "jsCode": js_code },
            "name": f"Log Output ({'True' if branch==0 else 'False'})", # Unique names help debugging
            "type": "n8n-nodes-base.code",
            "typeVersion": 2
        }
        self._add_node(node, branch_index=branch)
        return self

    def add_wait(self, amount, unit="seconds"):
        print(f"🧱 Adding Block: Wait ({amount} {unit})")

        node = {
            "parameters": {
                "resume": "timeInterval",
                "amount": amount,
                "unit": unit
            },
            "name": "Wait",
            "type": "n8n-nodes-base.wait",
            "typeVersion": 1
        }

        self._add_node(node)
        return self




    # --- LEGO BLOCK 6: EDIT FIELDS (SET) ---
    # in /mnt/data/n8n.py (N8nLegoBuilder)
    def add_edit_fields(self, assignments):
        """
        Renames or creates new fields.
        Assignments should be a dict: {"new_name": "value_or_expression"}
        """
        print(f"🧱 Adding Block: Edit Fields")
        values = []
        for name, value in assignments.items():
            values.append({
                "name": name,
                "value": value,
                "type": "string"  # Default to string, expressions work here
            })

        node = {
            "parameters": {
                # <-- direct 'values' array expected by n8n Set node
                "values": values
            },
            "name": "Edit Fields",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.2
        }
        self._add_node(node)
        return self

        # --- DEPLOYMENT ---
        # in /mnt/data/n8n.py

    def deploy(self):
        payload = {
            "name": self.name,
            "nodes": self.nodes,
            "connections": self.connections,
            "settings": {},
            "staticData": None
        }

        headers = {
            "X-N8N-API-KEY": N8N_API_KEY,
            "Content-Type": "application/json"
        }

        try:
            print("DEBUG: full payload being pushed to n8n:")
            import json as _json
            print(_json.dumps(payload, indent=2)[:2000])  # trunc to avoid giant prints, remove [:2000] if you want full

            res = requests.post(f"{N8N_HOST}/api/v1/workflows", headers=headers, json=payload)
            if not res.ok:
                # helpful for diagnosis
                print("ERROR: n8n returned non-200:")
                print(res.status_code, res.text)
                res.raise_for_status()

            wf_id = res.json()['id']

            # Activate Workflow
            act_res = requests.post(f"{N8N_HOST}/api/v1/workflows/{wf_id}/activate", headers=headers)
            if not act_res.ok:
                print("WARN: activation returned non-200:", act_res.status_code, act_res.text)

            return {
                "status": "success",
                "id": wf_id,
                "message": f"Workflow '{self.name}' deployed and activated!"
            }
        except Exception as e:
            # dump the error and response text if available
            print("DEPLOY ERROR:", str(e))
            return {
                "status": "error",
                "message": str(e)
            }
