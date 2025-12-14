import asyncio
import websockets
import json
import subprocess
import sys
import os
import glob

# Global variables
PROC = None
REQUEST_COUNTER = 0

def cleanup_on_startup():
    """Deletes old HTML files but KEEPS index.html."""
    print("🧹 SERVER STARTUP: Cleaning up old client files...")
    folder = "client"
    if not os.path.exists(folder):
        os.makedirs(folder)
        return

    # Delete all HTML files EXCEPT index.html
    for file in glob.glob(f"{folder}/*.html"):
        # SAFETY CHECK: Do not delete the main app file!
        if "index.html" in file:
            continue
            
        try:
            os.remove(file)
            print(f"   Deleted: {file}")
        except Exception as e:
            print(f"   Could not delete {file}: {e}")

async def ensure_agent_running():
    global PROC
    if PROC is None:
        print("🚀 Starting Agent...")
        PROC = subprocess.Popen(
            [sys.executable, "agent.py"], 
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1 
        )
        
        # Initialize
        print("👋 Sending Initialize...")
        init_msg = {
            "jsonrpc": "2.0",
            "id": 0, 
            "method": "initialize",
            "params": {"protocolVersion": "1.0", "capabilities": {}, "clientInfo": {"name": "JumpBot", "version": "1.0"}}
        }
        PROC.stdin.write(json.dumps(init_msg) + "\n")
        PROC.stdin.flush()
        
        while True:
            line = PROC.stdout.readline()
            if not line: break
            if "result" in line:
                print("✅ Agent Initialized!")
                break

async def handler(ws):
    global REQUEST_COUNTER
    print("Client connected")
    await ensure_agent_running()

    async for msg in ws:
        try:
            data = json.loads(msg)
            REQUEST_COUNTER += 1
            current_id = REQUEST_COUNTER
            
            print(f"📩 Request #{current_id}: {data['tool']}")

            # JSON-RPC Wrapper
            request = {
                "jsonrpc": "2.0",
                "id": current_id,
                "method": "tools/call",
                "params": {
                    "name": data["tool"],
                    "arguments": data["args"]
                }
            }
            
            PROC.stdin.write(json.dumps(request) + "\n")
            PROC.stdin.flush()

            while True:
                line = PROC.stdout.readline()
                if not line: break 
                
                if line.strip().startswith("{"):
                    try:
                        response = json.loads(line)
                        if response.get("id") == current_id:
                            # Unwrap result
                            final_result = {}
                            if "result" in response:
                                content = response["result"].get("content", [])
                                if content and content[0]["type"] == "text":
                                    try:
                                        final_result = json.loads(content[0]["text"])
                                    except:
                                        final_result = {"answer": content[0]["text"]}
                                else:
                                    final_result = response["result"]

                                print(f"✅ Success. Sending result to client.")
                                await ws.send(json.dumps(final_result))
                                
                            elif "error" in response:
                                print(f"❌ Agent Error: {response['error']}")
                                await ws.send(json.dumps({"error": response["error"]}))
                            break
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"❌ Error in handler: {e}")
            await ws.send(json.dumps({"error": str(e)}))

async def main():
    # RUN CLEANUP FIRST
    cleanup_on_startup()
    
    print("✅ GATEWAY LOADED")
    async with websockets.serve(handler, "localhost", 8765):
        print("🔌 WebSocket → MCP bridge running on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")