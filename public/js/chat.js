const socket = io();

// Elements of DOM
const messageFrom = document.querySelector("#message-form");
const messageInput = messageFrom.querySelector("input");
const messageButton = messageFrom.querySelector("button");
const sendLocationBtn = document.querySelector("#btn-location");
const messages = document.querySelector("#messages");
const leaveRoomBtn = document.querySelector("#btn-leave-room");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Extracting Query String parameters
/* "location.search"-> this function will provide us the query strig parameters including "?" too.
    like this "?username=m.bhatti&room=J1"
    So to convert them in to an object we are using a library called "Qs", which is inclued in chat.html file */

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // New message element
  const newMessage = messages.lastElementChild

  // Height of the new message
  const newMessageStyles = getComputedStyle(newMessage)
  const newMessageMargin = parseInt(newMessageStyles.marginBottom)
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin

  // Visible height
  const visibleHeight = messages.offsetHeight

  // Height of messages container
  const containerHeight = messages.scrollHeight

  // How far have I scrolled?
  const scrollOffset = messages.scrollTop + visibleHeight

  if(Math.round(containerHeight - newMessageHeight - 1) <= Math.round(scrollOffset)){
    messages.scrollTop = messages.scrollHeight;
}
};

// ------- to receive the events from server -----------
socket.on("message", (message) => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("hh:mm a"),
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (message) => {
  console.log(message);
  const html = Mustache.render(locationTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("hh:mm a"),
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  console.log(room);
  console.log(users);
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});
// ----------- FOR SENDING MESSAGE TO SERVER -------------
messageFrom.addEventListener("submit", (event) => {
  event.preventDefault();

  // setting disabled attribute of "Form Button"
  messageButton.setAttribute("disabled", "disabled");

  const msg = event.target.elements.message.value.trim();
  let userConfirmation = true;
  // check if messag is empty
  if (!msg || msg.length === "0") {
    userConfirmation = confirm("Do you want to send an empty message?");
  }
  if (userConfirmation) {
    socket.emit("sendMessage", msg, (error) => {
      messageInput.value = "";
      messageInput.focus();
      // to acknowledge that message has sent
      if (error) {
        return console.log(error);
      }
      console.log("Message delivered.");
    });
  }
  // re-enabling the button
  messageButton.removeAttribute("disabled");
});

leaveRoomBtn.addEventListener("click", (event) => {
  if (confirm("You want to leave the room?")) {
    location.href = "/";
  }
});

// ----------FOR SENDING LOCATION TO SERVER -------------------------
sendLocationBtn.addEventListener("click", (event) => {
  // setting disabled attribute of "Form Button"
  sendLocationBtn.setAttribute("disabled", "disabled");

  if (!navigator.geolocation) {
    return alert(
      "Your Browser does not support Geolocation. Please change it."
    );
  }
  // getting your location
  navigator.geolocation.getCurrentPosition((position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    socket.emit("sendLocation", location, () => {
      // re-enabling the button
      sendLocationBtn.removeAttribute("disabled");
      console.log("location shared");
    });
  });
});

// ------------EMITTING AN EVENT --------------

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
