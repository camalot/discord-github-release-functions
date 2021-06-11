"use strict";




module.exports = async function (context, req) {
  //context.log('JavaScript HTTP trigger function processed a request.');
  const crypto = require('crypto');
  const request = require("axios");
  const _async = require("async");
  // const path = require('path');
  // const fs = require('fs');
  // const envFile = path.join(__dirname, '../.env');
  // try {
  //   fs.accessSync(envFile, fs.F_OK);
  //   context.log("loading .env file");
  //   require('dotenv').config({ path: envFile });
  // } catch (e) {
  //   // no env file
  // }
  const config = require("../config");

  let _respond = function (context, code, body) {
    context.res = { status: code, body: { message: JSON.stringify(body) } };
  };

  let _createDiscordWebhookPayload = function (payload) {
    let outPayload = {
      // nonce: payload.release.node_id,
      embeds: [_createEmbed(payload)],
      // allowed_mentions: ["SOFTWARE UPDATES", "everyone"]
    };

    return outPayload;
  };

  let _createEmbed = function (payload) {
    let betaTag = payload.release.prerelease ? " [PRE-RELEASE]" : "";

    let fields = [{
      name: "**PROJECT**",
      value: payload.repository.name,
      inline: true
    },
    {
      name: "**VERSION**",
      value: payload.release.tag_name,
      inline: true
    },
    {
      name: "**RELEASED**",
      value: payload.release.published_at,
      inline: false
    },
    {
      name: "**URL**",
      value: `<${payload.release.html_url}>`,
      inline: false
    }];
    let assets = payload.release.assets;
    for (let x = 0; x < assets.length; ++x) {
      fields.push({
        name: `**${assets[x].name}**`,
        value: `:floppy_disk:<${assets[x].browser_download_url}>`,
        inline: true
      });
    }

    let outPayload = {
      title: `${payload.repository.name} ${payload.release.tag_name}${betaTag}`,
      // type: "rich",
      description: payload.release.body,
      timestamp: payload.release.published_at,
      url: payload.release.html_url,
      color: payload.release.prerelease ? config.discord.PRERELEASE_COLOR : config.discord.RELEASE_COLOR,
      footer: {

      },
      fields: fields
    };

    return outPayload;
  };


  let _processRequest = async function (context, req) {
    if (!req.body) {
      _respond(context, 500, "Missing Required Request Body");
      return;
    }


    let payload = null;
    if (typeof req.body === "string" || req.body instanceof String) {
      payload = JSON.parse(req.body);
    } else {
      payload = req.body;
    }


    if (payload.hook && payload.zen) {
      context.log("initialize hook");
      _respond(context, 200, "Successfully Registered Hook");
      return;
    }

    const payloadData = JSON.stringify(payload);
    const sigHeader = "X-Hub-Signature";
    const sig = context.req.get(sigHeader) || '';
    const hmac = crypto.createHmac('sha1', process.env.GITHUB_WEBHOOK_SECRET);
    const digest = Buffer.from('sha1=' + hmac.update(payloadData).digest('hex'), 'utf8');
    const checksum = Buffer.from(sig, 'utf8');
    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
      _respond(context, 500, `Request body digest (${digest}) did not match ${sigHeader} (${checksum})`);
      return;
    }


    if (payload.release.draft || payload.action !== "published") {
      context.log("skipping release that is not published");
      _respond(context, 200, "Skipping release that is not published");
      return;
    }

    let dpayload = _createDiscordWebhookPayload(payload);
    for (let hookIndex in config.discord.webhooks) {
      try {
        let hook = config.discord.webhooks[hookIndex];
        context.log(`Sending Payload to ${hook}`);
        await request.post(hook, dpayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        _respond(context, 500, err);
        return;
      }
    }
    _respond(context, 200, "Notify Discord of Release");
  };

  try {
    await _processRequest(context, req);
  } catch (err) {
    if(err && JSON.stringify(err) !== "{}") {
      context.log(`error: ${JSON.stringify(err)}`);
      _respond(context, 500, err);
    } else {
      _respond(context, 200, "");
    }
  }
};
