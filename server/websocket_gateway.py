import asyncio, websockets, json, subprocess

PROC = None

async def handler(ws):
    global PROC
    # start MCP agent if not running yet
    if PROC is None:
        PROC = subprocess.Popen(
            ["python3", "agent.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=0
        )

    async for msg in ws:
        data = json.loads(msg)
        # format as MCP call
        tool_name = data["tool"]
        args = data["args"]
        call = json.dumps({"type": "call", "name": tool_name, "arguments": args}) + "\n"
        PROC.stdin.write(call)
        PROC.stdin.flush()

        # read MCP response
        line = PROC.stdout.readline().strip()
        await ws.send(line)

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        print("🔌 WebSocket → MCP bridge running on ws://localhost:8765")
        await asyncio.Future()

asyncio.run(main())
