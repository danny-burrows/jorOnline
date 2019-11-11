// Sorry in advance, didnt have time to clean this all up. :\

var HOST = "localhost"
var PORT = "9001"

function chunkArray(myArray, chunk_size){
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index+chunk_size);
        tempArray.push(myChunk);
    }

    return tempArray;
}

function closingCode(){
   data = {"type": "user_disconnect"}
   ws.send(JSON.stringify(data));
   return null;
}
window.onbeforeunload = window.onunload = closingCode;

// Test for multi pages...
localStorage.openpages = Date.now();
var onLocalStorageEvent = function(e){
    if(e.key == "openpages"){
        // Listen if anybody else opening the same page!
        localStorage.page_available = Date.now();
    }
    if(e.key == "page_available"){
        if(window.location.pathname != "/the_end.html"){
            window.location.replace("../the_end.html");
            //alert("No man has two faces, so why should you?");
        }
    }
};
window.addEventListener('storage', onLocalStorageEvent, false);

// Test for incognito... (Firefox)
try {
  var db = indexedDB.open("test");
  db.onerror = function(){motd = document.getElementById("MOTD"); motd.innerHTML = "<div id=\"__txt_rec____\"><h3>Hi there...</h3>We think you are using incognito mode. If you are using this to spam then please consider the amount of work that went into the making of this site. We just want people to have a good time using it and would really like it if you do not spam the chat for no good reason. I trust you will see sense. - A friend.</div>"};
  db.onsuccess =function(){/*Clear mode, no need to do anything.*/};
}
catch(err) {
  console.log("Incog check failed: " + err);
}

// Test for incognito... (Chrome)
try {
var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
if (!fs) {
    console.log("Chrome Incog check failed...");
}
fs(window.TEMPORARY, 100, function (fs) {}, function (err) {
motd = document.getElementById("MOTD"); motd.innerHTML = "<div id=\"__txt_rec____\"><h3>Hi there...</h3>We think you are using incognito mode. If you are using this to spam then please consider the amount of work that went into the making of this site. We just want people to have a good time using it and would really like it if you do not spam the chat for no good reason. I trust you will see sense. - A friend.</div>"
});
}
catch(err){
  console.log("Incog check failed: " + err);
}



/* Set the width of the side navigation to 250px */
function openNav() {
  document.getElementById("mySidenav").style.width = "200px";

  var width = window.innerWidth
  || document.documentElement.clientWidth
  || document.body.clientWidth;

  if (width > 720) {
    document.body.style.margin = "0 200px 0 0";
    document.getElementById("aubutton").style.display = "none";
  }
  document.getElementById("mySidenav").style.padding = "60px 0 0 10px";
}

/* Set the width of the side navigation to 0 */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.body.style.margin = "0";
  document.getElementById("aubutton").style.display = "block";
  document.getElementById("mySidenav").style.padding = "0 0 0 0";
}

// request permission on page load
document.addEventListener('DOMContentLoaded', function () {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium or Firefox!');
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
});

function notifyMe(message) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('jorOnline', {
      icon: '/img/dragoon-shadow.png',
      body: message,
    });

    notification.onclick = function () {
      window.open("http://localhost:1234");
    };
  }
}

function readBlob() {

    var files = document.getElementById('files').files;
    if (!files.length) {
      //alert('Please select a file!');
      return;
    }

    var file = files[0];
    console.log(file)
    extension = (/[.]/.exec(file.name)) ? /[^.]+$/.exec(file.name) : undefined;
    console.log(extension);

    /*
    // Only process image files.
    if (!file.type.match('image.*')) {
      console.log("ONLY IMAGE FILES.");
      return;
    }
    */

    var reader = new FileReader();

    // If we use onloadend, we need to check the readyState.
    reader.onload  = function(evt) {
      if (evt.target.readyState == FileReader.DONE) { // DONE == 2

        if (file.size > 20000000) {
          alert("Please only upload files under 20MB hehe!\n(We still beat discord...)");
          return;
        }

        file_obj = {};
        // Generates a random ID...
        var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        file_obj.uid = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());

        var imgre = /(jpg|jpeg|bmp|png|ico)$/i;
        var linkre = /(exe|msi|pyc|zip|iso|html|htm|py|pyw|c|js|css)$/i;
        var txtre = /(txt)$/i;
        var vidre = /(webm|mp4|ogv)$/i;

        file_obj.type = "file"

        if(imgre.exec(extension)){
          file_obj.MIME = "img";
        }
        else if (linkre.exec(extension)){
          file_obj.MIME = "link";
        }
        else if (txtre.exec(extension)){
          file_obj.MIME = "txt";
        }
        else if (vidre.exec(extension)){
          file_obj.MIME = "vid";
        }
        else {
          alert("Sorry, we cannot currently support that file format.");
          return;
        }

        file_obj.filename = file.name.replace(/__/g, "__/");
        data_b64 = btoa(evt.target.result);
        data_chunks = chunkArray(data_b64, 400);

	output("File data Sending...");
        for (pkt_num=0; pkt_num<=data_chunks.length;pkt_num++){
          if (pkt_num == data_chunks.length){
            file_obj.number = -1
            file_obj.data = data_chunks[pkt_num]
            ws.send(JSON.stringify(file_obj))
            //console.log(file_obj)
          } else {
            file_obj.number = pkt_num
            file_obj.data = data_chunks[pkt_num]
            ws.send(JSON.stringify(file_obj))
            //console.log(file_obj)
          }
        }
	output("File data Sent.");
      }
    };
    reader.readAsBinaryString(file);
    document.getElementById("files").value = "";
}

var ws;

    function init() {

      // Connect to Web Socket
      ws = new WebSocket("ws://" +HOST+ ":" +PORT+ "/");
      file_objs = {}
      // Set event handlers.
      ws.onopen = function() {
        output("<font color=\"#b0cee5\">Connected to jorOnline.</font>");
        past_cur_use = false;
        getUsername();
      };

      ws.onmessage = function(e) {
        // e.data contains received string.
        message = e.data;

        try {
        message = JSON.parse(message)
        } catch(e) {
        console.log("NOT JSON: " + message)
        return
        }

        if (message.type == "file") {

          if (message.number == "-1") {
	    output("Got File Data...");
	    output("Checking File Data and building string...");
            str = ""
            for (i = 0; i < file_objs[message.uid].length; i++){
              if (file_objs[message.uid][i] != undefined){
                str += file_objs[message.uid][i]
              }
              else {
                console.log(file_objs[message.uid])
                console.log("Missing A Frame!")
              }
            }

            // Find a way to delete!
            file_objs[message.uid] = []

            console.log(message.MIME)

	    output("Outputting File...");
            if (message.MIME == "txt") {
              output("["+message.time+"] <font color=\""+message.user_color+"\">"+message.username+"</font>: "+"<div id=\"__txt_rec____\"><pre>"+message.show_filename+"\n"+atob(str)+"</pre></div>");
            } else if (message.MIME == "img") {
              var image = new Image();

              extension = (/[.]/.exec(message.filename)) ? /[^.]+$/.exec(message.filename) : undefined;
              //image.src = 'data:image/png;base64,' + atob(str);
              image.src = 'data:image/'+extension+';base64,' + str;
              image.style = "width: auto; max-height: 300px;"

              // Generates a random ID...
              var S4 = function() {
              return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
              };
              idfun = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
              log.innerHTML = "<div id=" + idfun + "></div><br>" + log.innerHTML;
              document.getElementById(idfun).appendChild(image)
              output("["+message.time+"] <font color=\""+message.user_color+"\">"+message.username+"</font>: ");
            } else if (message.MIME == "link") {
                function base64ToArrayBuffer(base64) {
                  var binaryString = window.atob(base64);
                  var binaryLen = binaryString.length;
                  var bytes = new Uint8Array(binaryLen);
                  for (var i = 0; i < binaryLen; i++) {
                     var ascii = binaryString.charCodeAt(i);
                     bytes[i] = ascii;
                  }
                  return bytes;
                }

                function saveByteArray(reportName, byte, extension) {
                  var blob = new Blob([byte], {type:"*/"+extension});//, {type: "/" + extension});
                  var link = document.createElement('a');
                  var linkText = document.createTextNode(reportName);
                  link.appendChild(linkText);
                  //link.title = reportName;
                  link.href = window.URL.createObjectURL(blob);
                  var fileName = reportName;
                  link.download = fileName;
                  link.classList.add('file-link');

                  // Generates a random ID...
                  var S4 = function() {
                  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
                  };

                  idfun = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
                  log.innerHTML = "<div id=" + idfun + "></div><br>" + log.innerHTML;
                  document.getElementById(idfun).appendChild(link)
                  //output(sender);
                };

              sender = message.username
              extension = (/[.]/.exec(message.filename)) ? /[^.]+$/.exec(message.filename) : undefined;
              filecontent = str

              var dataArr = base64ToArrayBuffer(filecontent);
              saveByteArray(message.filename, dataArr, extension[0]);
            } else if (message.MIME == "vid") {
                function base64ToArrayBuffer(base64) {
                  var binaryString = window.atob(base64);
                  var binaryLen = binaryString.length;
                  var bytes = new Uint8Array(binaryLen);
                  for (var i = 0; i < binaryLen; i++) {
                     var ascii = binaryString.charCodeAt(i);
                     bytes[i] = ascii;
                  }
                  return bytes;
                }

                function saveByteArray(reportName, byte, extension) {
                  var blob = new Blob([byte], {type:"*/"+extension});//, {type: "/" + extension});

                  var video = document.createElement('video');
                  video.src = window.URL.createObjectURL(blob);
                  video.setAttribute("controls","controls")

                  //var link = document.createElement('a');
                  //var linkText = document.createTextNode(reportName);
                  //link.appendChild(linkText);
                  //link.title = reportName;
                  //link.href = window.URL.createObjectURL(blob);
                  //var fileName = reportName;
                  //link.download = fileName;
                  //link.classList.add('file-link');

                  // Generates a random ID...
                  var S4 = function() {
                  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
                  };

                  idfun = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
                  log.innerHTML = "<div id=" + idfun + "></div><br>" + log.innerHTML;
                  document.getElementById(idfun).appendChild(video)
                };

              sender = message.username
              extension = (/[.]/.exec(message.filename)) ? /[^.]+$/.exec(message.filename) : undefined;
              filecontent = str

              var dataArr = base64ToArrayBuffer(filecontent);
              saveByteArray(message.filename, dataArr, extension[0]);
            }

          } else if (message.number == "0") {
	    output("Building New File...");
            file_objs[message.uid] = []
            file_objs[message.uid][message.number] = [message.data]
          } else {
            file_objs[message.uid][message.number] = [message.data]
          }
        }

        else if (message.type == "client_joined") {
            // Add new client to list of clients.
            var userlog = document.getElementById("user_log");
            userlog.innerHTML =  userlog.innerHTML + "<div id=\""+message.id+"\">"+message.id+"</div>";
        }
        else if (message.type == "client_name") {
            // Add new name to specified client.
            username = message.username;
            console.log(username)
            userid = message.id;

            var userelement = document.getElementById(userid);
            userelement.innerHTML = " - " + username;
            if (past_cur_use && username != "[BLOCKED]" && true != username.endsWith("</font>")) {
              notifyMe("User joined: " + username)
            }
            if (username == document.cookie) {
              past_cur_use = true;
            }
        }
        else if (message.type == "client_left") {
            // Remove client from active list.
            document.getElementById(message.id).outerHTML = "";
        }
		    else if (message.type == "client_notif") {
			     notifyMe(message.user + " just called you!")
        }
        else if (message.type == "terminate_session") {
            // Banish to oblivion...
            window.location.replace("../the_end.html");
        }
        else if (message.type == "msg") {
          output("["+message.time+"] <font color=\""+message.user_color+"\">"+message.username+"</font>: "+message.data)
        }
        else if (message.type == "serv_msg") {
          output(message.data)
        }
        else {
          output("[Unreadable message]");
          console.log(e.data);
        }
      };

      ws.onclose = function() {
        setTimeout(init, 1000);
      };

      ws.onerror = function(e) {
        output("<font color=\"red\">Err: Connection dropped, attempting to re-connect.</font>");
        document.getElementById("user_log").innerHTML = "";
        console.log(e)
      };
    }

    function onSubmitIMG() {
      readBlob();
    }

    function onSubmit() {
      var input = document.getElementById("input");
      var msg = input.value.replace(/__/g, "__/");

      if (msg.startsWith("/uc ")){
        col = msg.split(' ')[1];
        exdays = 30;
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = "user_color=" + col + "; " + expires;
      }

      msg_obj = {"type":"msg", "data":msg}
      ws.send(JSON.stringify(msg_obj));
      input.value = "";
      input.focus();
    }

    function onCloseClick() {
      ws.close();
    }

    function output(str) {
      var log = document.getElementById("log");
      log.innerHTML = str + "<br>" + log.innerHTML;
    }

    function getUsername() {
    var person = "";
    var person = document.cookie.replace(/(?:(?:^|.*;\s*)person\s*\=\s*([^;]*).*$)|^.*$/, "$1");

    var user_color = document.cookie.replace(/(?:(?:^|.*;\s*)user_color\s*\=\s*([^;]*).*$)|^.*$/, "$1");

    while (person == "" || person.length > 27) {
        var person = prompt("Please enter a username (Max 27 chars).", "");
    }
    if(person == "") {
        var person = prompt("Please enter a username.", "");
    }
    if (person != null) {
        exdays = 30;
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = "person=" + person + "; " + "user_color=" + user_color + "; " + expires;

        name_obj = {"type":"new_username", "username":person}
        ws.send(JSON.stringify(name_obj));
    }
    if (user_color == "") {
      var user_color = "#FFF";
    }
    if (user_color != "") {
      color_obj = {"type":"msg", "data":"/uc "+user_color}
      ws.send(JSON.stringify(color_obj));
    }
}
