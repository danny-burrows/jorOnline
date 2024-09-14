from os import chdir
from sys import stdout
from socketserver import ThreadingMixIn
from http.server import SimpleHTTPRequestHandler, HTTPServer
from threading import Thread

from websocket_server_api import WebsocketServer
from socket_server import new_client, message_received


lg = """
    _             ____        _ _
   (_)           / __ \\      | (_)
    _  ___  _ __| |  | |_ __ | |_ _ __   ___
   | |/ _ \\| '__| |  | | '_ \\| | | '_ \\ / _ \\
   | | (_) | |  | |__| | | | | | | | | |  __/
   | |\\___/|_|   \\____/|_| |_|_|_|_| |_|\\___|
  _/ |
 |__/
 
 By Dan Burrows
"""


def run_socket_server(SOC_HOST, SOC_PORT):
    server = WebsocketServer(SOC_PORT, SOC_HOST)
    server.set_fn_new_client(new_client)
    server.set_fn_message_received(message_received)
    try:
        server.run_forever()
    except AssertionError:
        print("Ignoring Assertion Error")


if __name__ == "__main__":
    print(lg)

    HOST = '0.0.0.0'
    PORT = 80
    SOC_PORT = 9001

    stdout.write('- Initializing WebSocket Server Threads...\t')
    wsoc_thread = Thread(target=run_socket_server, args=(HOST, SOC_PORT))
    stdout.write('[DONE]\n')
    
    class Server_With_Threading(ThreadingMixIn, HTTPServer):
        pass

    # Building server object...
    stdout.write('- Initializing HTTP Server Threads...\t')
    server = Server_With_Threading((HOST, PORT), SimpleHTTPRequestHandler)
    stdout.write('[DONE]\n')

    # Pointing to folder containing index.html...
    stdout.write('- Locking In File System...\t')
    chdir('files')
    stdout.write('[DONE]\n')


    # Verifying index.html to prevent plain file serving...
    stdout.write('- Verifying \'index.html\'...\t')
    try:
        with open('index.html', 'r') as x:
            pass
        stdout.write('[DONE]\n')
    except FileNotFoundError:
        stdout.write('[FAILED]\tSERVER MIGHT BE RUNNING WITHOUT AN INTERFACE!\n')

    stdout.write('- Running WebSocket Server...\t')
    wsoc_thread.start()
    stdout.write('[DONE]\n')

    # Running the server...
    print('[jor_online_web] Active On... ' + HOST + ':' + str(PORT))
    print('[jor_online_sockets] Active On... ' + HOST + ':' + str(SOC_PORT))
    try:
        while True:
            stdout.flush()
            server.handle_request()
    except KeyboardInterrupt:
        print("\nKILLING SERVER...")
