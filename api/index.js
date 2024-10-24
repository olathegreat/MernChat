const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/UserModel");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const ws = require("ws");   
const { promisify } = require('util');
const MessageModel = require("./models/MessageModel");
const fs = require('fs')

// Convert jwt.verify to a promise-based function
const verifyJwt = promisify(jwt.verify);
const bcryptsalt = bcrypt.genSaltSync(10);

mongoose
  .connect(process.env.DATABASE_LOCAL)
  .then((con) => console.log("Db Connected ✅"));

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);
app.use("/uploads", express.static(__dirname + "/uploads"));  
app.get("/test", (req, res) => {
  res.json("test ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptsalt);
    const userCreated = await User.create({
      username: username,
      password: hashedPassword,
    });
    
    jwt.sign(
      { userId: userCreated._id, username },
      process.env.JWT_SECRET,
      {},
      (err, token) => {
        if (err) throw err;

        res.cookie("token", token,  { sameSite: "none", secure: true }).status(201).json({
          id: userCreated._id,
          userCreated,
        });
      }
    );
  } catch (err) {
    if (err) throw err;
  }

  //   res.status(201).json(userCreated)
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });

  if (foundUser) {
    const passwordMatch = bcrypt.compareSync(password, foundUser.password);

    if (passwordMatch) {
      jwt.sign(
        { userId: foundUser._id, username },
        process.env.JWT_SECRET,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token,  { sameSite: "none", secure: true }).status(201).json({
            id: foundUser._id,
            userCreated,
          });
        }
      );

    }
  }
  res.status(200).json("ok");
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("ok"); })

app.get("/profile", (req, res) => {
  const token = req.cookies?.token; // Get the token from cookies
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
      if (err) {
        return res.status(401).json("Invalid token");
      }
      res.json(info);
     // Return the user's info if token is valid
    });
  } else {
    res.status(401).json("No token");
  }

});

app.get('/people', async (req, res) => {
  try {
    const users = await UserModel.find({}, { _id: 1, username: 1 });  // Add 'await'
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });  // Error handling
  }
});


app.get('/messages/:userId', async (req, res) => {
  const { userId } = req.params; 
  const { token } = req.cookies;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, info) => {
      if (err) {
        return res.status(401).json("Invalid token");
      }

      req.user = info; // Store user info in the request

      try {
        const messages = await MessageModel.find({
          $or: [
            { sender: req.user.userId, recipient: userId },
            { sender: userId, recipient: req.user.userId },
          ],
        }).sort({ createdAt: 1 }); // Sort messages by creation time, descending

        res.json(messages); // Send the retrieved messages as a response
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json("Error fetching messages");
      }
    });
  } else {
    res.status(401).json("No token");
  }
});


const server = app.listen(4000);

const wss = new ws.WebSocketServer({ server });

const broadcastOnlineUsers = () => {
  const onlineUsers = [...wss.clients]
    .filter(client => client.userId) // Filter only authenticated clients
    .map(client => ({
      userId: client.userId,
      username: client.username,
    }));
  
  wss.clients.forEach(client => {
    if (client.readyState === ws.OPEN) {
      client.send(
        JSON.stringify({
          type: 'users-online',
          online: onlineUsers,
        })
      );
    }
  });
};


// wss.on('connection', async (connection, req) => {
//   // read user name and id from the cookie for this connnection
//   const cookies = req.headers.cookie;
//   console.log(cookies)

//   connection.isAlive = true;  

//   connection.timer = setInterval(()=>{
//     connection.ping()
  
//     connection.death = setTimeout(()=>{
//       connection.isAlive = false;
//       clearInterval(connection.timer);

//       connection.terminate();
//       broadcastOnlineUsers();
//       // console.log('death')
//     }, 1000) 
//   }, 5000)

//   connection.on('pong', ()=>{
//     clearTimeout(connection.death);
//   })

//   if (cookies) {
//     const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
//     console.log(tokenCookieString)
//     if (tokenCookieString) {
//       const token = tokenCookieString.split('=')[1];
//       console.log(token)
//       const info = await verifyJwt(token, process.env.JWT_SECRET);

//       connection.username = info.username;
//       connection.userId = info.userId;

//       // Broadcast the updated list of online users
//       broadcastOnlineUsers();

//       connection.on('message', async(message) => {
//         const messageData = JSON.parse(message.toString());
//         const { recipient, text } = messageData;

//         if (recipient && text) {
//         const messageDoc = await MessageModel.create({
//             sender: connection.userId,
//             recipient,
//             text,
//           });
//           [...wss.clients]
//             .filter(c => c.userId === recipient)
//             .forEach(c => c.send(JSON.stringify({ 
//               text, sender: connection.userId,
//               _id: messageDoc._id, 
//               recipient
//              })));
//         }
//       });

//       connection.send(JSON.stringify({ message: 'Welcome!' }));

//       // Handle user disconnection
//       connection.on('close', () => {
//         broadcastOnlineUsers(); // Update the list of online users
//       });
//     }
//   }
// })

wss.on('connection', async (connection, req) => {
  // Read cookies from request headers
  const cookies = req.headers.cookie;
  
  if (!cookies) {
    console.error("No cookies found in the request");
    connection.close();
    return;
  }

  const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
  
  if (!tokenCookieString) {
    console.error("No token found in cookies");
    connection.close();
    return;
  }

  const token = tokenCookieString.split('=')[1];
  
  try {
    // Verify the token
    const info = await verifyJwt(token, process.env.JWT_SECRET);
    
    // Set the user info on the connection
    connection.username = info.username;
    connection.userId = info.userId;
    
    // Broadcast online users
    broadcastOnlineUsers();
    
    connection.on('message', async (message) => {
      const messageData = JSON.parse(message.toString());
      const { recipient, text, file } = messageData;
      let filename = null
       if(file){
           const parts = file.name.split('.');  
           const extension = parts[parts.length - 1]; 
          filename = Date.now() + '.' + extension; 
          const path = __dirname + '/uploads/' + filename;
         const bufferData = new  Buffer(file.data, 'base64')

           fs.writeFileSync(path, bufferData, ()=>{
            console.log('file saved')
           });
       }
      if (recipient && (text || file)) {
        const messageDoc = await MessageModel.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? filename : null
        }); 
        

        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender: connection.userId,
            _id: messageDoc._id,
            recipient,
            file: file ? filename : null  
          })));
      }
    });

    connection.send(JSON.stringify({ message: 'Welcome!' }));
    
    connection.on('close', () => {
      broadcastOnlineUsers();
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    connection.close();
  }
});

