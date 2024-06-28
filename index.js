const express = require("express");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

require("dotenv").config();

const app = express();

const PORT = process.env.port || 5000;
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

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

app.get("/access_token", nocache, generateAccessToken);

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
