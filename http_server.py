lg = """
    _             ____        _ _
   (_)           / __ \\      | (_)
    _  ___  _ __| |  | |_ __ | |_ _ __   ___
   | |/ _ \\| '__| |  | | '_ \\| | | '_ \\ / _ \\
   | | (_) | |  | |__| | | | | | | | | |  __/
   | |\\___/|_|   \\____/|_| |_|_|_|_| |_|\\___|
  _/ |
 |__/
"""

HOST = '0.0.0.0'
PORT = 1234

from os import system, chdir
from sys import stdout
from multiprocessing import Process
from socketserver import ThreadingMixIn
from http.server import SimpleHTTPRequestHandler, HTTPServer

print(lg)

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

# Running the server...
print('[jor_online_web] Active On... ' + HOST + ':' + str(PORT))
try:
    while True:
        stdout.flush()
        server.handle_request()
except KeyboardInterrupt:
    print("\nKILLING SERVER...")
