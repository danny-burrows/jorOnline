var HOST = window.location.hostname;
var HTTP_PORT = window.location.port;
var PORT = "9001";

function genUid() {
  // Generates a random ID...
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

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

function notifyMe(message) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('jorOnline', {
      icon: '/img/logo.png',
      body: message,
    });

    notification.onclick = function () {
      window.open(`http://${HOST}:${HTTP_PORT}`);
    };
  }
}

function onSubmit() {
  var input = document.getElementById("input");
  var msg = input.value.replace(/__/g, "__/");

  if (msg.startsWith("/uc ")){
    var col = msg.split(' ')[1];
    var exdays = 30;
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    document.cookie = `user_colour=${col}; expires=${d.toUTCString()}`;
  }

  var msg_obj = {"type": "msg", "data": msg};
  ws.send(JSON.stringify(msg_obj));
  input.value = "";
  input.focus();
}

function onSubmitFile() {

  var files = document.getElementById('file').files;
  if (!files.length) {
    return;
  }

  var file = files[0];
  console.log(file);
  extension = (/[.]/.exec(file.name)) ? /[^.]+$/.exec(file.name) : undefined;
  console.log(extension);

  console.log(document.getElementById('file'));
  
  var reader = new FileReader();

  // If we use onloadend, we need to check the readyState.
  reader.onload  = function(evt) {
    if (evt.target.readyState == FileReader.DONE) { // DONE == 2

      if (file.size > 15000000) {
        alert("Jeez thats a lot to carry, I'm sorry we can only take files under 15MB!");
        return;
      }

      file_obj = {
        uid: genUid(),
        type: "file",
        filename: file.name,
        data: btoa(evt.target.result)
      };

      var imgre = /(jpg|jpeg|bmp|png|ico|gif)$/i;
      var txtre = /(txt)$/i;
      var vidre = /(webm|mp4|ogv)$/i;

      if(imgre.exec(extension)){
        file_obj.MIME = "img";
      }
      else if (txtre.exec(extension)){
        file_obj.MIME = "txt";
      }
      else if (vidre.exec(extension)){
        file_obj.MIME = "vid";
      }
      else {
        file_obj.MIME = "link";
      }

      console.log("File data Sending...");
      ws.send(JSON.stringify(file_obj));
      console.log("File data Sent.");
    }
  };
  reader.readAsBinaryString(file);
  
  input = document.getElementById("file");
  input.value = "";
  inputLabel = input.nextElementSibling;
  inputLabel.querySelector('span').innerHTML = '<i class="fa fa-file-text" style="font-size:24px"></i>';
}

function file_content_to_blob(file_content, extension) {
  var byte_arr = base64ToArrayBuffer(file_content);
  return new Blob([byte_arr], {type:"*/"+extension});
}

function outputLink(message, file_content, extension) {
  var blob = file_content_to_blob(file_content, extension);
  
  var link = document.createElement('a');
  var linkText = document.createTextNode(message.filename);
  link.appendChild(linkText);
  link.href = window.URL.createObjectURL(blob);
  link.download = message.filename;
  link.classList.add('file-link');

  outputFileObj(message, link);
};

function outputVideo(message, file_content, extension) {
  var blob = file_content_to_blob(file_content, extension);

  var video = document.createElement('video');
  video.src = window.URL.createObjectURL(blob);
  video.setAttribute("controls", "controls");
  video.setAttribute("style", "width: auto; max-height: 300px;");

  outputFileObj(message, video);
};

function outputImage(message, fileContent, extension) {
  var image = new Image();

  image.src = `data:image/${extension};base64,${fileContent}`;
  image.style = "width: auto; max-height: 300px;";

  outputFileObj(message, image);
}

function outputFileObj(message, file_obj) {
  var idfun = genUid();
  message.data = `<div id="${idfun}"></div>`;
  outputMessage(message);
  document.getElementById(idfun).appendChild(file_obj);  
}

function outputMessage(message){
  msg = `<div><strong class="user-colour" style="--user-colour:${message.user_colour};">${message.username}</strong><sub> ${message.time}</sub>: ${message.data}</div>`;
  output(msg);
}

function output(str) {
  var log = document.getElementById("log");
  log.innerHTML = str + log.innerHTML;
}

function getUsername() {
  var person = "";
  var person = document.cookie.replace(/(?:(?:^|.*;\s*)person\s*\=\s*([^;]*).*$)|^.*$/, "$1");

  var user_colour = document.cookie.replace(/(?:(?:^|.*;\s*)user_colour\s*\=\s*([^;]*).*$)|^.*$/, "$1");

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
    document.cookie = "person=" + person + "; " + "user_colour=" + user_colour + "; " + expires;

    name_obj = {"type":"new_username", "username":person}
    ws.send(JSON.stringify(name_obj));
  }
  if (user_colour == "") {
    var user_colour = "#F1F1F1";
  }
  if (user_colour != "") {
    color_obj = {"type":"msg", "data":"/uc "+user_colour}
    ws.send(JSON.stringify(color_obj));
  }
}


var ws;
function init() {

  // Connect to Web Socket
  ws = new WebSocket(`ws://${HOST}:${PORT}/`);
  file_objs = {}
  
  // Set event handlers.
  ws.onopen = function() {
    output("<div><i class=\"jor-yellow\">Connected to jorOnline.</i></div>");
    past_cur_use = false;
    getUsername();
  };

  ws.onmessage = function(e) {
    message = e.data;

    try {
      message = JSON.parse(message)
    } catch(e) {
      console.log("NOT JSON: " + message)
      return
    }

    if (message.type == "msg") {
      outputMessage(message);
    }
    else if (message.type == "file") {
      console.log("Got File Data...");

      fileContent = message.data;
      extension = (/[.]/.exec(message.filename)) ? /[^.]+$/.exec(message.filename) : undefined;

      console.log("Outputting File...");
      
      if (message.MIME == "txt") {          
        message.data = `<div id="text-block"><pre>${message.show_filename}\n${atob(fileContent)}</pre></div>`;
        outputMessage(message);
      } else if (message.MIME == "img") {
        outputImage(message, fileContent, extension[0]);
      } else if (message.MIME == "link") {
        outputLink(message, fileContent, extension[0]);
      } else if (message.MIME == "vid") {
        outputVideo(message, fileContent, extension[0]);
      }
    }
    else if (message.type == "client_joined") {
      // Add new client to list of clients.
      var userlog = document.getElementById("user_log");
      var userid = message.id;
      userlog.innerHTML = `${userlog.innerHTML}<div id="${userid}">${userid}</div>`
    }
    else if (message.type == "client_name") {
      // Add new name to specified client.
      var username = message.username;
      var user_colour = message.user_colour;
      var userid = message.id;

      console.log(message)

      var userelement = document.getElementById(userid);
      userelement.classList.add("user-list-obj")
      userelement.innerHTML = `<input type="button" class="user-btn" onclick="calloutUser('${username}')" value="${username}" />`;
      
      input = userelement.firstElementChild;
      input.style.setProperty('--user-colour', user_colour);
      
      if (past_cur_use && username != "[BLOCKED]" && true != username.endsWith("</font>")) {
        notifyMe("User joined: " + username)
      }
      if (username == document.cookie) {
        past_cur_use = true;
      }
    }
    else if (message.type == "client_left") {
      // Remove client from active list.
      var userid = message.id;
      document.getElementById(userid).outerHTML = "";
    }
    else if (message.type == "client_notif") {
      notifyMe(`${message.user} just called you!`)
    }
    else if (message.type == "terminate_session") {
      // Banish to oblivion...
      window.location.replace("../the_end.html");
    }
    else if (message.type == "serv_msg") {
      output(`<div>${message.data}</div>`);
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
    output('<div><i class="jor-red">Err: Connection dropped, attempting to re-connect.</i></div>');
    document.getElementById("user_log").innerHTML = "";
    console.log(e)
  };
}

function calloutUser(username) {
  var msg_obj = {"type": "msg", "data": `@${username}`};
  ws.send(JSON.stringify(msg_obj));
}

function closingCode(){
  data = {"type": "user_disconnect"};
  ws.send(JSON.stringify(data));
  ws.close();
  return null;
}
window.onbeforeunload = window.onunload = closingCode;