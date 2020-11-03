import re
import time
import json
from collections import deque


greeting = {"type":"serv_msg", "data":"Start of chat log."}
global message_history
message_history = deque([json.dumps(greeting)])


# Logs messages before sending.
def send_message_to_all_log(message, server):
    global message_history
    message_history.append(message)
    server.send_message_to_all(message)
    if len(message_history) > 40:
        message_history.popleft()


# Called for every client connecting (after handshake).
def new_client(client, server):
    for i in server.clients:
        try:
            if i["id"] != client["id"]:
                data = {"type": "client_joined", "id":i["id"]}
                server.send_message(client, json.dumps(data))
            data = {"type": "client_name", "id":i["id"], "user_colour":i['user_colour'], "username":i['username']}
            server.send_message(client, json.dumps(data))
        except KeyError:
            pass

    for message in message_history:
        server.send_message(client, message)

    data = {"type":"client_joined", "id":client["id"]}
    server.send_message_to_all(json.dumps(data))


# Called when a client sends a message to us.
def message_received(client, server, message):
    message = json.loads(message)

    if "username" not in client:
        client['username'] = str(client['id'])

    if message["type"] == "user_disconnect":
        data = {"type": "client_left", "id": client['id']}
        server.send_message_to_all(json.dumps(data))

    elif client['is_blocked']:
        pass

    elif message["type"] == "file":
        message['username'] = client['username']
        message['user_color'] = client['user_colour']
        message['time'] = time.strftime("%H:%M", time.localtime())

        if message["MIME"] in ("img", "link", "vid"):
            server.send_message_to_all(json.dumps(message))

        elif message["MIME"] == "txt":
            filename = message["filename"]
            show_filename = "#"*(len(filename)+4)+"\n# "+filename+" #\n"+"#"*(len(filename)+4)+"\n"
            message["show_filename"] = show_filename
            server.send_message_to_all(json.dumps(message))

    elif message["type"] == "new_username":
        username = message["username"].strip()
        username = "".join(username.split())

        if len(username) > 27:
            username = username[:27]

        client['username'] = username
        data = {"type": "client_name", "id": str(client["id"]), "username": username}
        server.send_message_to_all(json.dumps(data))

    elif message["type"] == "msg":
        msgData = message["data"]

        msgData = msgData.replace("&", "&amp")  # Fixes html injections.
        msgData = msgData.replace("<", "&lt")
        msgData = msgData.replace(">", "&gt")
        msgData = msgData.replace("\"", "&quot")
        msgData = msgData.replace("\u200b", "")  # Block's no-width spaces!
        msgData = msgData.replace("\ufeff", "")

        # Limits messages to 400 chars.
        if len(msgData) > 400:
            msgData = msgData[:400] + '...'
            msg = "<button class=\"btn-dark\">Server: Whoa whoa, hold up there buddy! Messages must be 400 chars or less, maybe retry that...</button>"
            server.send_message(client, json.dumps({"type":"serv_msg", "data":msg}))

        # Hyperliinks; Experimental regex...
        hyperlinks = re.findall('http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\), ]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', msgData)
        if len(hyperlinks):
            for hyperlink in hyperlinks:
                msgData = msgData.replace(hyperlink, '<a href="' + hyperlink + '">' + hyperlink + '</a>')

        # Dealing with italics...
        if "*" in msgData:
            italic_finder = re.findall(r'\*(.*?)\*', msgData)  # Botched regex, gets confused with multiple * and breaks maths. :/
            for found in italic_finder:
                msgData = msgData.replace("*" + found + "*", "<i>" + found + "</i>")

        # User addressing...
        if "@" in msgData:
            user_finder = re.findall("(?<=^|(?<=[^a-zA-Z0-9-_\.]))@([A-Za-z0-9-_]+[A-Za-z0-9-_]+)", msgData)
            for found in user_finder:
                for user in server.clients:
                    if found == user["username"]:
                        msgData = msgData.replace("@" + user["username"], "<button class=\"btn-dark\"><font color=\"" + user["user_colour"] + "\">" + user["username"] + "</font></button>")
                        data = {"type": "client_notif", "user": client['username']}
                        server.send_message(user, json.dumps(data))

        # Commands!
        if msgData[0] == "/":
            try:
                # Colour selection...
                if msgData[1] == "c":
                    colour = re.findall("/c (.*?) ", msgData)
                    try:
                        msgData = msgData.replace("/c " + colour[0] + " ", "")
                        msgData = "<font color=" + colour[0] + ">" + msgData + "</font>"
                    except IndexError:
                        pass

                # Username colour selection...
                if msgData[1:3] == "uc":
                    user_colour = re.findall("/uc (.*)", msgData)
                    try:
                        client['user_colour'] = user_colour[0]
                        # username = "<font color=\"%s\">%s</font>" % (client['user_colour'], client['username'])
                        data = {"type":"client_name", "id":client["id"], "username":client['username'], "user_colour": client['user_colour']}
                        server.send_message_to_all(json.dumps(data))
                        return
                    except IndexError:
                        return

                if msgData[1] == "m":
                    msgData = msgData.replace("/me", "")
                    msgData = msgData.replace("/m", "")
                    data = {"type":"serv_msg", "data":"<button class=\"btn-dark\">" + client['username'] + "</button>" + msgData}
                    send_message_to_all_log(json.dumps(data), server)
                    return

                if msgData[1] == "i":
                    msgData = msgData.replace("/ip ", "")
                    msgData = msgData.replace("/i ", "")
                    msgData = msgData.replace("/ip", "")
                    msgData = "\"" + msgData + "\" ~ Ian Patterson 2019"
            except IndexError:
                pass

        if msgData.strip().lower() == client['last_msg'].strip().lower():  # Check if message and sender (client) is the same as the last.
            client['spam_count'] += 1  # Increment Spam counter.
            if client['spam_count'] > 3:  # If sender has sent the same message for the 4th time they are blocked.
                send_message_to_all_log(json.dumps({"type": "serv_msg", "data": "%s is a puppy murderer." % client['username']}), server)
                client['is_blocked'] = 1  # Also blocks messages from this client!
                return
        else:
            client['spam_count'] = 0  # Reset spam counter to 0, as message is unique to last.

        client['last_msg'] = msgData  # Set the last message for spam check.

        message['username'] = client['username']
        message['user_color'] = client['user_colour']
        message['time'] = time.strftime("%H:%M", time.localtime())
        message['data'] = msgData
        send_message_to_all_log(json.dumps(message), server)

        client['tt'] = time.time()

