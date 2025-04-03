import asyncio
import websockets
import json
import time
import sys

async def test_websocket():
    uri = "ws://localhost:8080"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to server")

            # Wait for initial data
            response = await websocket.recv()
            data = json.loads(response)
            print("Received initial data:", data)

            # Test 1: Send a chat message
            chat_message = {
                "type": "chat_message",
                "username": "TestUser",
                "message": "Hello, this is a test message!"
            }

            print("\nTest 1: Sending first chat message...")
            await websocket.send(json.dumps(chat_message))
            response = await websocket.recv()
            data = json.loads(response)
            print("Response:", data)

            # Test 2: Try to send another message immediately (should be rate limited)
            print("\nTest 2: Testing rate limit - sending second message immediately...")
            chat_message["message"] = "This should be rate limited"
            await websocket.send(json.dumps(chat_message))
            response = await websocket.recv()
            data = json.loads(response)
            print("Response:", data)

            # Test 3: Wait 11 seconds and try again (should succeed)
            print("\nTest 3: Waiting 11 seconds to test rate limit expiry...")
            await asyncio.sleep(11)
            chat_message["message"] = "This should work after waiting"
            await websocket.send(json.dumps(chat_message))
            response = await websocket.recv()
            data = json.loads(response)
            print("Response:", data)

            # Test 4: Test anonymous username
            print("\nTest 4: Testing anonymous message...")
            anon_message = {
                "type": "chat_message",
                "message": "Anonymous message test"
            }
            await asyncio.sleep(11)  # Wait for rate limit
            await websocket.send(json.dumps(anon_message))
            response = await websocket.recv()
            data = json.loads(response)
            print("Response:", data)

            print("\nAll tests completed. Listening for broadcasts (press Ctrl+C to stop)...")
            while True:
                try:
                    response = await websocket.recv()
                    data = json.loads(response)
                    print("\nReceived broadcast:", data)
                except websockets.exceptions.ConnectionClosed:
                    print("Connection closed by server")
                    break
    except ConnectionRefusedError:
        print("Error: Could not connect to the server. Make sure the server is running.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

async def main():
    try:
        await test_websocket()
    except KeyboardInterrupt:
        print("\nTest client stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main()) 