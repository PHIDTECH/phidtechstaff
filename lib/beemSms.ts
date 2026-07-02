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
  error?: string;
}

/** Normalise a phone number to 255XXXXXXXXX format */
function normalisePhone(phone: string): string {
  // Strip all non-digit characters except leading +
  let p = phone.trim().replace(/[\s\-\(\)\.]/g, "");
  // Remove leading +
  if (p.startsWith("+")) p = p.slice(1);
  // Replace leading 0 with 255
  if (p.startsWith("0")) p = "255" + p.slice(1);
  // If it doesn't start with 255, prepend it (handles bare 7XXXXXXXX format)
  if (!p.startsWith("255")) p = "255" + p;
  return p;
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
): Promise<{ ok: boolean; error?: string }> {
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
      log.error = "Beem credentials not configured — go to Admin → SMS Settings";
      appendLog(log);
      return { ok: false, error: log.error };
    }

    const normalised = normalisePhone(phone);
    if (normalised.length < 9) {
      log.status = "failed";
      log.error = `Invalid phone number: ${phone}`;
      appendLog(log);
      return { ok: false, error: log.error };
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

    // Parse Beem response — success code is 100 (or 200 in some versions)
    let body: Record<string, unknown> = {};
    try { body = await res.json(); } catch {}
    console.log("[beemSms] HTTP", res.status, JSON.stringify(body));

    const beemOk =
      res.ok &&
      (body.code === 100 || body.code === 200 ||
       (typeof body.message === "string" && body.message.toLowerCase().includes("success")));

    if (!beemOk) {
      const reason = (body.message as string) || (body.error as string) || `HTTP ${res.status}`;
      log.error = `Beem: ${reason} (code ${body.code ?? res.status})`;
    }
    log.status = beemOk ? "sent" : "failed";
    appendLog(log);

    if (!beemOk) {
      return { ok: false, error: log.error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[beemSms] sendSms error:", err);
    log.status = "failed";
    log.error = String(err);
    appendLog(log);
    return { ok: false, error: log.error };
  }
}

function appendLog(entry: SmsLog) {
  try {
    const logs = readDb<SmsLog[]>("sms_log", []);
    logs.unshift(entry);
    writeDb("sms_log", logs.slice(0, 500)); // keep last 500
  } catch {}
}
