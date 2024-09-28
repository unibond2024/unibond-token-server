const express = require("express");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const fs = require("fs");

require("dotenv").config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.port || 5000;
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const serviceAccount = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const nocache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};

const generateAccessToken = (req, res) => {
  // set response header
  res.header("Access-Control-Allow-Origin", "*");

  // get channel
  const channel_name = req.query.channelName;
  if (!channel_name) {
    return res.status(500).json({ error: "channel is requried" });
  }

  // get uid
  let uid = req.query.uid;
  if (!uid || uid == "") {
    uid = 0;
  }

  // get role
  let role = RtcRole.PUBLISHER;

  // get expire time
  let expire_time = req.query.expireTime;
  if (!expire_time || expire_time == "") {
    expire_time = 3600;
  } else {
    expire_time = parseInt(expire_time, 10);
  }

  // calculate previlege expire time
  const current_time = Math.floor(Date.now() / 1000);
  const privilege_expire_time = current_time + expire_time;

  // build the token
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channel_name,
    uid,
    role,
    privilege_expire_time
  );

  // return the token
  return res.json({ token: token });
};

const sendPushNotification = (req, res) => {
  const { token, title, body, callData } = req.body;

  if (!token || !title || !body || !callData) {
    return res.status(400).send("Token, title, body, callData are required");
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      callData: JSON.stringify(callData),
      userId: callData.called, // Include userId to match the call recipient
    },
    token,
  };

  admin
    .messaging()
    .send(message)
    .then((response) => {
      res.status(200).send("Notification sent successfully: " + response);
    })
    .catch((error) => {
      res.status(500).send("Error sending notification: " + error);
    });
};

const sendMessageNotification = (req, res) => {
  const { title, body, userId, chatDocId } = req.body;

  if (!title || !body || userId || chatDocId) {
    return res.status(400).send("title, body, userId,chatDocId are required");
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      userId, // Include userId to match user
      chatDocId,
    },
  };

  admin
    .messaging()
    .send(message)
    .then((response) => {
      res.status(200).send("Notification sent successfully: " + response);
    })
    .catch((error) => {
      res.status(500).send("Error sending notification: " + error);
    });
};

app.get("/access_token", nocache, generateAccessToken);
app.post("/send_notification", nocache, sendPushNotification);
app.post("/send_message", nocache, sendMessageNotification);

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
