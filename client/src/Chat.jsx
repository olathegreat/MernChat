import React, { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./userContext";
import axios from "axios";
import Contact from "./Contact";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { username, setUsername, id, setId } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const divUnderMessages = useRef();

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:4000/ws");
    setWs(websocket);

    websocket.addEventListener("message", (e) => {
      console.log("Received WebSocket message:", e.data);
      try {
        const messageData = JSON.parse(e.data);

        if (messageData.type === "users-online") {
          setOnlinePeople(messageData.online.reduce((acc, person) => {
            acc[person.userId] = person.username;
            return acc;
          }, {}));
        } else if ("text" in messageData) {
          setMessages((prev) => [...prev, messageData]);
        }
      } catch (error) {
        console.error("Invalid message format:", e.data);
      }
    });

    return () => {
      websocket.close();
    };
  }, []);

  const selectContact = (userId) => setSelectedUserId(userId);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const sendMessage = (e, file = null) => {
    if (e) e.preventDefault();
    const message = {
      text: newMessageText,
      recipient: selectedUserId,
      file,
    };

    ws.send(JSON.stringify(message));
    

    const parts = file.name.split('.');  
    const extension = parts[parts.length - 1]; 
   const filename = Math.round(Date.now()/ 10000)*10000  + '.' + extension; 

    setMessages((prev) => [
      ...prev,
      { ...{
        text: newMessageText,
      recipient: selectedUserId,
      file: filename
      }, sender: id, _id: Date.now() },
    ]);
    setNewMessageText("");
  };
  const sendFile = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage(null, { data: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };
   useEffect(() => {
    const div = divUnderMessages.current;
    if (div) div.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => setMessages(res.data));
    }
  }, [selectedUserId]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      setOfflinePeople(res.data.filter((p) => !onlinePeople[p._id]));
    });
  }, [onlinePeople]);
  console.log("Online people excluding me:", onlinePeopleExclOurUser);

  const logout = () => {
    axios.post("/logout").then(() => {
      setId(null);
      setUsername(null);
      setWs(null);
    });
  };

 
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/4 flex flex-col">
        <div className="flex-grow">
          <Logo />

          {Object.keys(onlinePeopleExclOurUser).length > 0 &&
            id &&
            Object.keys(onlinePeopleExclOurUser).map((userId) => (
              <Contact
                key={userId}
                online={true}
                id={userId}
                username={onlinePeopleExclOurUser[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={userId === selectedUserId}
              />
            ))}

          {Object.keys(offlinePeople).length > 0 &&
            id &&
            Object.keys(offlinePeople).map((userId) => (
              <Contact
                key={userId}
                online={false}
                id={userId}
                username={offlinePeople[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={userId === selectedUserId}
              />
            ))}
        </div>

        <div className="p-2 flex items-center justify-center text-center">
          <span className="mr-2 flex text-sm items-center text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fill-rule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clip-rule="evenodd"
              />
            </svg>

            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 border rounded-sm text-gray-500"
          >
            logout
          </button>
        </div>
      </div>

      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow overflow-y-scroll">
          {selectedUserId ? (
            messages.map((message, index) => (
              
              <div
                className={`${
                  message.sender === id ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={` ${
                    message.sender === id
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500"
                  } p-2 inline-block my-2 rounded-md text-left text-sm`}
                  key={index}
                >
                  {message.text}
                  {message.file && (
  <div className="">
    <a
      target="_blank"
      className="border-b flex items-center gap-1"
      href={axios.defaults.baseURL + "/uploads/" + message.file}
      rel="noopener noreferrer" // For better security
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
      </svg>
      {message.file}
    </a>
  </div>
)}

                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-300  h-full flex items-center justify-center">
              &larr; Select a person from the sidebar{" "}
            </div>
          )}
          <div className="h-2" ref={divUnderMessages}></div>
        </div>

        {selectedUserId && (
          <form className="flex gap-2 " onSubmit={sendMessage}>
            <input
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="bg-white rounded-sm flex-grow border p-2"
              type="text"
              placeholder="Type your message here"
            />
            <label className="bg-blue-200 p-2 rounded-sm cursor-pointer text-gray-600 border border-blue-200">
              <input 
              
              type="file" 
              className="hidden"
              onChange={sendFile}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6"
              >
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="rounded-sm bg-blue-500 p-2 text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
