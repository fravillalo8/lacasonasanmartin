#!/usr/bin/env node
/**
 * Deploys dist/ to Hostinger shared hosting via their REST API + TUS upload.
 * Replicates the same 3-step flow used by hostinger-api-mcp internally.
 *
 * Required env vars:
 *   HOSTINGER_API_TOKEN  — Bearer token from Hostinger hPanel
 *   HOSTINGER_DOMAIN     — e.g. lacasonasanmartin.cl
 *   ARCHIVE_PATH         — path to the zip file to upload
 */

import axios from "axios";
import * as tus from "tus-js-client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE_URL = "https://developers.hostinger.com";
const TOKEN = process.env.HOSTINGER_API_TOKEN;
const DOMAIN = process.env.HOSTINGER_DOMAIN;
const ARCHIVE = process.env.ARCHIVE_PATH;

if (!TOKEN || !DOMAIN || !ARCHIVE) {
  console.error("Missing required env vars: HOSTINGER_API_TOKEN, HOSTINGER_DOMAIN, ARCHIVE_PATH");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function resolveUsername() {
  const url = `${BASE_URL}/api/hosting/v1/websites?domain=${encodeURIComponent(DOMAIN)}`;
  const res = await axios.get(url, { headers });
  const websites = res.data?.data;
  if (!websites?.length) throw new Error(`No website found for domain: ${DOMAIN}`);
  return websites[0].username;
}

async function fetchUploadCredentials(username) {
  const res = await axios.post(
    `${BASE_URL}/api/hosting/v1/files/upload-urls`,
    { username, domain: DOMAIN },
    { headers }
  );
  const { url, auth_key, rest_auth_key } = res.data;
  if (!url || !auth_key || !rest_auth_key) throw new Error("Invalid upload credentials");
  return { uploadUrl: url, authKey: auth_key, restAuthKey: rest_auth_key };
}

async function uploadFile(uploadUrl, authKey, restAuthKey) {
  const archiveName = path.basename(ARCHIVE);
  const stats = fs.statSync(ARCHIVE);
  const fileStream = fs.createReadStream(ARCHIVE);

  const cleanUrl = uploadUrl.replace(/\/$/, "");
  const uploadUrlWithFile = `${cleanUrl}/${archiveName}?override=true`;

  // Pre-upload POST (required by Hostinger's TUS endpoint)
  await axios.post(uploadUrlWithFile, "", {
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "upload-length": String(stats.size),
      "upload-offset": "0",
    },
    validateStatus: (s) => s === 201,
  });

  // TUS upload
  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream, {
      uploadUrl: uploadUrlWithFile,
      chunkSize: 5 * 1024 * 1024,
      headers: { "X-Auth": authKey, "X-Auth-Rest": restAuthKey },
      metadata: { filename: archiveName },
      onError: reject,
      onSuccess: resolve,
      onProgress: (uploaded, total) => {
        const pct = Math.round((uploaded / total) * 100);
        process.stdout.write(`\r  Uploading... ${pct}%`);
      },
    });
    upload.start();
  });
  console.log(`\n  Uploaded: ${archiveName}`);
  return archiveName;
}

async function triggerDeploy(username, archiveName) {
  const url = `${BASE_URL}/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/deploy`;
  const res = await axios.post(url, { archive_path: archiveName }, { headers });
  return res.data;
}

(async () => {
  try {
    console.log(`Deploying ${ARCHIVE} → ${DOMAIN}`);

    console.log("1/3 Resolving username...");
    const username = await resolveUsername();
    console.log(`    username: ${username}`);

    console.log("2/3 Fetching upload credentials...");
    const { uploadUrl, authKey, restAuthKey } = await fetchUploadCredentials(username);

    console.log("3/3 Uploading file...");
    const archiveName = await uploadFile(uploadUrl, authKey, restAuthKey);

    console.log("    Triggering deploy...");
    const result = await triggerDeploy(username, archiveName);
    console.log("Deploy triggered:", JSON.stringify(result));
    console.log("Done.");
  } catch (err) {
    console.error("Deploy failed:", err.message);
    process.exit(1);
  }
})();
