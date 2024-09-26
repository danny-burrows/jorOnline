var HOST = window.location.hostname;
var HTTP_PORT = window.location.port;
var PORT = "9001";

function notifyMe(message) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('jorOnline', {
      icon: '/img/logo.png',
      body: message,
    });

    notification.onclick = function () {
      window.open(`https://${HOST}:${HTTP_PORT}`);
    };
  }
}

async function on_submit_chat_form() {
  const chat_input = document.getElementById("chat-input");
  const message = chat_input.value;

  if (message.startsWith("/uc ")){
    var col = message.split(' ')[1];
    var exdays = 30;
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    document.cookie = `user_colour=${col}; expires=${d.toUTCString()}`;
  }

  // N.B. File picker doesn't have `multiple` attribute so only one file can be provided.
  const file_input = document.getElementById('file-input');
  const file = file_input.files.length > 0 ? file_input.files[0] : null;
  if (message.length == 0 && file == null) {return;}
  let message_object = {};
  if (file) {
    try {
      const file_data = await read_file_data(file);
      message_object = {type: "file", data: message, file_data: file_data};
    } catch (e) {
      console.error(e);
      return;
    } finally {
      file_input.value = "";
      const file_input_label = document.getElementById("file-input-label");
      file_input_label.querySelector('span').innerHTML = '<i class="fa fa-file-text"></i>';
    }
  } else {
    message_object = {type: "text", data: message};
  }

  ws.send(JSON.stringify(message_object));
  chat_input.value = "";
  chat_input.focus();
}

async function read_file_data(file) {
  const MAX_FILE_SIZE = 1048576; // 1MiB is the maximum message size that python websockets supports.
  if (file.size > MAX_FILE_SIZE) {
    alert("That is a lot to carry! I'm sorry we can only take files under 1MiB.");
    throw new Error("File too large!");
  }

  let file_data = null;
  if (file.type.startsWith("text/")) {
    file_data = await file.text();
  } else {
    file_data = await read_file_as_data_url(file);
  }

  return {
    uid: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    data: file_data
  };
}

function read_file_as_data_url(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // Resolve the promise with the result
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file); // Read the file as a Base64 data URL
  });
}

function outputFileObj(message, file_obj) {
  const image_div_id = crypto.randomUUID();
  message.data = `${message.data}<div id="${image_div_id}" class="my-2"></div>`;
  outputMessage(message);
  document.getElementById(image_div_id).appendChild(file_obj);
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
    color_obj = {"type":"text", "data":"/uc "+user_colour}
    ws.send(JSON.stringify(color_obj));
  }
}

var ws;
function init() {
  const chat_form = document.getElementById("chat-form");
  chat_form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await on_submit_chat_form();
  });

  const file_input = document.getElementById("file-input");
  file_input.addEventListener("input", (event) => {
    event.preventDefault();
    const files = file_input.files;
    if (files.length > 0) {
      const file_input_label = document.getElementById("file-input-label");
      file_input_label.innerHTML = `<span style="top: -5px;">${files[0].name}</span>`;
    }
  });

  // Connect to Web Socket
  ws = new WebSocket(`wss://${HOST}/websocket`);
  file_objs = {}

  // Set event handlers.
  ws.onopen = function() {
    output("<div><em class=\"jor-yellow\">Connected to jorOnline.</em></div>");
    past_cur_use = false;
    getUsername();
  };

  ws.onmessage = function(event) {
    message = event.data;

    try {
      message = JSON.parse(message)
    } catch(e) {
      console.error(`Failed to parse message (${message}): ${e}`);
      return;
    }

    if (message.type == "text") {
      outputMessage(message);
    } else if (message.type == "file") {
      const file_data = message.file_data;
      const file_type = file_data.type;

      if (file_type.startsWith("image/")) {
        const image = new Image();
        image.src = file_data.data;
        image.style = "width: auto; max-height: 300px;";
        outputFileObj(message, image);
      } else if (file_type.startsWith("text/")) {
        console.log(file_data)
        message.data = `${message.data}<div id="text-block"><pre>${file_data.name}\n${file_data.data}</pre></div>`;
        outputMessage(message);
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

      var userelement = document.getElementById(userid);
      userelement.classList.add("user-list-obj")
      userelement.innerHTML = `<button class="user-btn" onclick="calloutUser('${username}')">${username}</button>`;

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
    output('<div><em class="jor-red">Err: Connection dropped, attempting to re-connect.</em></div>');
    document.getElementById("user_log").innerHTML = "";
    console.log(e)
  };
}

function calloutUser(username) {
  var msg_obj = {"type": "text", "data": `@${username}`};
  ws.send(JSON.stringify(msg_obj));
}

function closingCode(){
  ws.close();
  return null;
}
window.onbeforeunload = window.onunload = closingCode;
