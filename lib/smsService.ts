/**
 * SMS Service — Africa's Talking (most used in Tanzania/East Africa)
 * Configure via environment variables in ecosystem.config.js:
 *   AT_USERNAME=your_username
 *   AT_API_KEY=your_api_key
 *   AT_SENDER_ID=PHIDTECH   (optional short code / sender name)
 */

interface SmsSendResult { success: boolean; messageId?: string; error?: string; }

export async function sendSms(phone: string, message: string): Promise<SmsSendResult> {
  const username = process.env.AT_USERNAME;
  const apiKey   = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID ?? "";

  if (!username || !apiKey) {
    console.warn("[SMS] Africa's Talking credentials not configured. Skipping SMS.");
    return { success: false, error: "SMS not configured" };
  }

  // Normalize phone — ensure it starts with country code (default +255 for Tanzania)
  let normalized = phone.replace(/\s+/g, "");
  if (normalized.startsWith("0")) normalized = "+255" + normalized.slice(1);
  else if (normalized.startsWith("255")) normalized = "+" + normalized;
  else if (!normalized.startsWith("+")) normalized = "+255" + normalized;

  try {
    const body = new URLSearchParams({
      username,
      to: normalized,
      message,
      ...(senderId ? { from: senderId } : {}),
    });

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey,
      },
      body: body.toString(),
    });

    const data = await res.json();
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === "Success") {
      return { success: true, messageId: recipient.messageId };
    }
    return { success: false, error: recipient?.status ?? "Unknown error" };
  } catch (e) {
    console.error("[SMS] Failed to send:", e);
    return { success: false, error: String(e) };
  }
}
