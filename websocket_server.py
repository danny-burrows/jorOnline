import re
import time
import json
import asyncio

from collections import deque
from sys import stdout
from websockets.asyncio.server import broadcast, serve
from websockets.exceptions import ConnectionClosedError

from common import logo


clients = set()
greeting = {"type": "serv_msg", "data": "Start of chat log."}
message_history = deque([json.dumps(greeting)])


class Client:
    def __init__(self, websocket):
        self.websocket = websocket
        self.username = ""
        self.user_colour = ""
        self.is_blocked = False
        self.last_message = ""
        self.spam_count = 0
        self.tt = None

    @property
    def raw_id(self):
        return self.websocket.id

    @property
    def id(self):
        return str(self.raw_id)


def send_message_to_all_no_log(message):
    broadcast((client.websocket for client in clients), message)


def send_message_to_all(message):
    global message_history
    message_history.append(message)
    send_message_to_all_no_log(message)
    if len(message_history) > 40:
        message_history.popleft()


# Called for every client connecting (after handshake).
async def register_client(websocket):
    new_client = Client(websocket)

    global clients
    for client in clients:
        data = {"type": "client_joined", "id": client.id}
        await websocket.send(json.dumps(data))

        data = {
            "type": "client_name",
            "id": client.id,
            "user_colour": client.user_colour,
            "username": client.username,
        }
        await websocket.send(json.dumps(data))

    for message in message_history:
        await websocket.send(message)

    data = {"type": "client_joined", "id": new_client.id}
    clients.add(new_client)
    send_message_to_all_no_log(json.dumps(data))


async def handle_client_disconnect(websocket):
    global clients
    clients = set(client for client in clients if client.raw_id != websocket.id)
    data = {"type": "client_left", "id": str(websocket.id)}
    send_message_to_all_no_log(json.dumps(data))


async def handle_message(websocket, message):
    client = next(client for client in clients if client.raw_id == websocket.id)
    message = json.loads(message)

    if client.username is None:
        client.username = client.id

    elif client.is_blocked:
        pass

    elif message["type"] == "file":
        message["username"] = client.username
        message["user_colour"] = client.user_colour
        message["time"] = time.strftime("%H:%M", time.localtime())

        if message["MIME"] in ("img", "link", "vid"):
            send_message_to_all(json.dumps(message))

        elif message["MIME"] == "txt":
            filename = message["filename"]
            box_padding = "#" * (len(filename) + 4)
            show_filename = f"{box_padding}\n# {filename} #\n{box_padding}\n"
            message["show_filename"] = show_filename
            send_message_to_all(json.dumps(message))

    elif message["type"] == "new_username":
        username = message["username"].strip()
        username = "".join(username.split())

        username = username[:27] if len(username) > 27 else username

        client.username = username
        data = {"type": "client_name", "id": str(client.id), "username": username}
        send_message_to_all_no_log(json.dumps(data))

    elif message["type"] == "msg":
        msgData = message["data"]

        msgData = msgData.replace("&", "&amp")  # Fixes html injections.
        msgData = msgData.replace("<", "&lt")
        msgData = msgData.replace(">", "&gt")
        msgData = msgData.replace('"', "&quot")
        msgData = msgData.replace("\u200b", "")  # Block's no-width spaces!
        msgData = msgData.replace("\ufeff", "")

        # Limits messages to 400 chars.
        if len(msgData) > 400:
            msgData = msgData[:400] + "..."
            msg = '<button class="btn-dark">Server: Whoa whoa, hold up there buddy! Messages must be 400 chars or less, maybe retry that...</button>'
            await websocket.send(json.dumps({"type": "serv_msg", "data": msg}))

        # Hyperliinks; Experimental regex...
        hyperlinks = re.findall(
            r"\b(?:https?://|www\.)\S+\b",
            msgData,
        )
        if len(hyperlinks):
            for hyperlink in hyperlinks:
                msgData = msgData.replace(
                    hyperlink,
                    f'<a href="{hyperlink}" target="_blank" rel="noopener noreferrer">{hyperlink}</a>',
                )

        # Dealing with italics...
        if "*" in msgData:
            italic_finder = re.findall(
                r"\*(.*?)\*", msgData
            )  # Botched regex, gets confused with multiple * and breaks maths. :/
            for found in italic_finder:
                msgData = msgData.replace(f"*{found}*", f"<i>{found}</i>")

        # User addressing...
        if "@" in msgData:
            user_finder = re.findall(
                r"(?<=^|(?<=[^a-zA-Z0-9-_\.]))@([A-Za-z0-9-_]+[A-Za-z0-9-_]+)", msgData
            )
            for found in user_finder:
                for user in clients:
                    if found == user.username:
                        msgData = msgData.replace(
                            f"@{user.username}",
                            f'<button class="user-btn user-btn-active" style="--user-colour:{user.user_colour};" onclick="calloutUser(\'{user.username}\')">{user.username}</button>',
                        )
                        data = {"type": "client_notif", "user": client.username}
                        await user.websocket.send(json.dumps(data))

        # Commands!
        if msgData[0] == "/":
            # Colour selection
            if msgData[1] == "c":
                colour = re.findall("/c (.*?) ", msgData)

                msgData = msgData.replace(f"/c {colour[0]} ", "")
                msgData = f'<font color="{colour[0]}">{msgData}</font>'

            # Username colour selection
            elif msgData[1:3] == "uc":
                user_colour = re.findall("/uc (.*)", msgData)
                client.user_colour = user_colour[0]
                data = {
                    "type": "client_name",
                    "id": client.id,
                    "username": client.username,
                    "user_colour": client.user_colour,
                }
                send_message_to_all_no_log(json.dumps(data))
                return

            # Actions
            elif msgData[1] == "m":
                msgData = msgData.replace("/me", "")
                msgData = msgData.replace("/m", "")
                data = {
                    "type": "serv_msg",
                    "data": f'<button class="user-btn user-btn-active" style="--user-colour:{client.user_colour};">{client.username}</button>{msgData}',
                }
                send_message_to_all(json.dumps(data))
                return

        if (
            msgData.strip().lower() == client.last_message.strip().lower()
        ):  # Check if message and sender (client) is the same as the last.
            client.spam_count += 1  # Increment Spam counter.
            if (
                client.spam_count > 3
            ):  # If sender has sent the same message for the 4th time they are blocked.
                data = {
                    "type": "serv_msg",
                    "data": f"{client.username} was removed for spam.",
                }
                send_message_to_all(json.dumps(data))
                client.is_blocked = 1  # Also blocks messages from this client!
                return
        else:
            client.spam_count = (
                0  # Reset spam counter to 0, as message is unique to last.
            )

        client.last_message = msgData

        message["username"] = client.username
        message["user_colour"] = client.user_colour
        message["time"] = time.strftime("%d %b %H:%M", time.localtime())
        message["data"] = msgData
        send_message_to_all(json.dumps(message))

        client.tt = time.time()


async def websocket_handler(websocket):
    await register_client(websocket)
    try:
        async for message in websocket:
            await handle_message(websocket, message)
        await websocket.wait_closed()
    except ConnectionClosedError as e:
        print(f"[websocket error] connection closed early: {e}")
    finally:
        await handle_client_disconnect(websocket)


async def create_websocket_server_future():
    async with serve(websocket_handler, HOST, PORT):
        await asyncio.get_running_loop().create_future()


if __name__ == "__main__":
    print(logo)

    HOST = "0.0.0.0"
    PORT = 9001

    stdout.write("- Building Websocket Server Future...\t")
    websocket_server_future = create_websocket_server_future()
    stdout.write("[DONE]\n")

    print("[jor_online_websockets] Active On... " + HOST + ":" + str(PORT))
    asyncio.run(websocket_server_future)
