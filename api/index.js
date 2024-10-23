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

app.get("/profile", (req, res) => {
  const token = req.cookies?.token; // Get the token from cookies
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
      if (err) {
        return res.status(401).json("Invalid token");
      }
      res.json(info); // Return the user's info if token is valid
    });
  } else {
    res.status(401).json("No token");
  }
});

const server = app.listen(4000);

const wss = new ws.WebSocketServer({ server });

wss.on('connection', async (connection, req) => {
  const cookies = req.headers.cookie;

  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      

      try {
        const info = await verifyJwt(token, process.env.JWT_SECRET);
        console.log(info)
        connection.username = info.username;
        connection.userId = info.userId;
        console.log('Authenticated:', connection.username, connection.userId);

        // Send list of online users to all clients after authentication
        const onlineUsers = [...wss.clients].map(client => ({
          userId: client.userId,
          username: client.username,
        }));

        console.log('Online Users:', onlineUsers);
        [...wss.clients].forEach(client => {
          client.send(JSON.stringify({ type: 'users-online', online: onlineUsers }));
        });

        // Optionally send a welcome message to the connected user
        connection.send(JSON.stringify({ message: 'Welcome!' }));
        
      } catch (err) {
        console.error('JWT Verification Failed:', err);
        connection.send(JSON.stringify({ error: 'Authentication failed' }));
        connection.close(); // Close connection if JWT verification fails
      }
    }
  }
});
