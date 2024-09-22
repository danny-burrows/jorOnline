from os import chdir
from sys import stdout
from http.server import SimpleHTTPRequestHandler, HTTPServer
from threading import Thread

from common import logo

if __name__ == "__main__":
    print(logo)

    HOST = "0.0.0.0"
    PORT = 8080

    # Building server object...
    stdout.write("- Initializing HTTP Server Threads...\t")
    server = HTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
    stdout.write("[DONE]\n")

    # Pointing to folder containing index.html...
    stdout.write("- Locking In File System...\t")
    chdir("files")
    stdout.write("[DONE]\n")

    # Verifying index.html to prevent plain file serving...
    stdout.write("- Verifying 'index.html'...\t")
    try:
        with open("index.html", "r") as x:
            pass
        stdout.write("[DONE]\n")
    except FileNotFoundError:
        stdout.write("[FAILED]\tSERVER MIGHT BE RUNNING WITHOUT AN INTERFACE!\n")

    # Running the server...
    print("[jor_online_web] Active On... " + HOST + ":" + str(PORT))
    try:
        while True:
            stdout.flush()
            server.handle_request()
    except KeyboardInterrupt:
        print("\nKILLING SERVER...")
