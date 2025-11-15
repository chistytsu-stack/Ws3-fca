const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Function to check if the author matches
async function checkAuthor(authorName) {
  try {
    const response = await axios.get("https://author-check.vercel.app/name");
    return response.data.name === authorName;
  } catch (error) {
    console.error("Error checking author:", error);
    return false;
  }
}

module.exports = {
  config: {
    name: "porn",
    aliases: ["porn"],
    author: "Vex_Kshitiz",
    version: "1.0",
    cooldowns: 5,
    role: 2, // only bot admin by default
    shortDescription: "18+ tiktok video",
    longDescription: "18+ tiktok video",
    category: "18+",
    guide: "{p}uff"
  },

  onStart: async function ({ api, event, message, usersData }) {

    // ➤ BOT ADMINS
    const botAdmins = global.GoatBot.config.adminBot || [];

    const isBotAdmin = botAdmins.includes(event.senderID);

    // ➤ GROUP ADMINS
    const threadInfo = await api.getThreadInfo(event.threadID);
    const groupAdmins = threadInfo.adminIDs.map(adm => adm.id);
    const isGroupAdmin = groupAdmins.includes(event.senderID);

    // Check both
    if (!isBotAdmin && !isGroupAdmin) {
      return api.sendMessage(
        "❌ This command can be used only by:\n👉 Group Admins\n👉 Bot Admins",
        event.threadID,
        event.messageID
      );
    }

    // Author safety check
    const isAuthorValid = await checkAuthor(module.exports.config.author);
    if (!isAuthorValid) {
      return message.reply("⚠ Author changer alert! This command belongs to **Vex_Kshitiz**.");
    }

    const apiUrl = "https://only-tik.vercel.app/kshitiz";

    try {
      const response = await axios.get(apiUrl);
      const { videoUrl, likes } = response.data;

      if (!videoUrl) return message.reply("Video URL not found!");

      // Create cache folder
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const tempVideoPath = path.join(cacheDir, `${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempVideoPath);

      const videoStream = await axios.get(videoUrl, { responseType: "stream" });
      videoStream.data.pipe(writer);

      writer.on("finish", () => {
        const stream = fs.createReadStream(tempVideoPath);

        message.reply(
          {
            body: `❤️ Likes: ${likes}`,
            attachment: stream
          },
          () => fs.unlinkSync(tempVideoPath) // auto-delete file
        );
      });

      writer.on("error", () => {
        message.reply("Video download failed.");
      });

    } catch (err) {
      console.error("Error:", err);
      return message.reply("Something went wrong! Try again later.");
    }
  }
};
