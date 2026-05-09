import { readDb, writeDb } from "./serverDb";

export interface BeemSettings {
  apiKey: string;
  secretKey: string;
  senderId: string;
}

interface SmsLog {
  id: string;
  to: string;
  recipientName: string;
  message: string;
  status: "sent" | "failed" | "no_config";
  sentAt: string;
  trigger?: string;
}

/** Normalise a phone number to 255XXXXXXXXX format */
function normalisePhone(phone: string): string {
  return phone
    .replace(/[\s\-\(\)]/g, "")
    .replace(/^\+/, "")
    .replace(/^0/, "255");
}

/**
 * Send an SMS via the Beem Africa API.
 * Returns true on success.  Logs every attempt to sms_log.json.
 */
export async function sendSms(
  phone: string,
  recipientName: string,
  message: string,
  trigger?: string
): Promise<boolean> {
  const settings = readDb<BeemSettings>("beem_settings", {
    apiKey: "", secretKey: "", senderId: "INFO",
  });

  const log: SmsLog = {
    id: `sms_${Date.now()}`,
    to: phone,
    recipientName,
    message,
    status: "no_config",
    sentAt: new Date().toISOString(),
    trigger,
  };

  try {
    if (!settings.apiKey || !settings.secretKey) {
      appendLog(log);
      return false;
    }

    const normalised = normalisePhone(phone);
    if (normalised.length < 10) {
      log.status = "failed";
      appendLog(log);
      return false;
    }

    const credentials = Buffer.from(`${settings.apiKey}:${settings.secretKey}`).toString("base64");
    const res = await fetch("https://apisms.beem.africa/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_addr: settings.senderId || "INFO",
        schedule_time: "",
        encoding: 0,
        message,
        recipients: [{ recipient_id: 1, dest_addr: normalised }],
      }),
    });

    log.status = res.ok ? "sent" : "failed";
    appendLog(log);
    return res.ok;
  } catch (err) {
    console.error("[beemSms] sendSms error:", err);
    log.status = "failed";
    appendLog(log);
    return false;
  }
}

function appendLog(entry: SmsLog) {
  try {
    const logs = readDb<SmsLog[]>("sms_log", []);
    logs.unshift(entry);
    writeDb("sms_log", logs.slice(0, 500)); // keep last 500
  } catch {}
}
