
const crypto = require("crypto");

function verifyTelegram(initData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !initData) {
    throw new Error("Telegram login is not configured");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));

  if (
    !hash ||
    !authDate ||
    Date.now() / 1000 - authDate > 86400 ||
    Date.now() / 1000 - authDate < -60
  ) {
    throw new Error("Telegram session expired");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(token)
    .digest();

  const expected = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const actualBuffer = Buffer.from(hash, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid Telegram signature");
  }

  const user = JSON.parse(params.get("user") || "{}");

  if (!user.id) {
    throw new Error("Telegram user not found");
  }

  return user;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only"
    });
  }

  try {
    const { action, initData } = req.body || {};
    const user = verifyTelegram(initData);

    const adminId = process.env.ADMIN_TELEGRAM_ID || "";
    const isAdmin = String(user.id) === String(adminId);

    if (action === "login") {
      return res.status(200).json({
        ok: true,
        user: {
          id: String(user.id),
          name: user.first_name || "Игрок",
          isAdmin
        }
      });
    }

    if (action === "admin_check") {
      if (!isAdmin || !adminId) {
        return res.status(403).json({
          ok: false,
          error: "Нет доступа"
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Администратор подтверждён"
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Это действие пока не подключено к базе данных"
    });
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: error.message || "Ошибка авторизации"
    });
  }
};
