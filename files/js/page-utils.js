// Request notification permission on page load...
document.addEventListener('DOMContentLoaded', function () {
  if (!Notification) {
    alert('Desktop notifications not available in your browser.');
    return;
  }
  if (Notification.permission !== "granted")
    Notification.requestPermission();
});


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
  db.onerror = function(){tagline = document.getElementById("tagline"); tagline.innerHTML = "<div id=\"text-block\"><h3>Hi there...</h3>We think you are using incognito mode. If you are using this to spam then please consider the amount of work that went into the making of this site. We just want people to have a good time using it and would really like it if you do not spam the chat for no good reason. I trust you will see sense. - A friend.</div>"};
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
tagline = document.getElementById("tagline"); tagline.innerHTML = "<div id=\"text-block\"><h3>Hi there...</h3>We think you are using incognito mode. If you are using this to spam then please consider the amount of work that went into the making of this site. We just want people to have a good time using it and would really like it if you do not spam the chat for no good reason. I trust you will see sense. - A friend.</div>"
});
}
catch(err){
  console.log("Incog check failed: " + err);
}
