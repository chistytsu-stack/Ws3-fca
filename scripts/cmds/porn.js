const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Function to check if the author matches
async function checkAuthor(authorName) {
  try {
    const response = await axios.get('https://author-check.vercel.app/name');
    const apiAuthor = response.data.name;
    return apiAuthor === authorName;
  } catch (error) {
    console.error("Error checking author:", error);
    return false;
  }
}

module.exports = {
  config: {
    name: "porn",
    aliases: ["uff", "porn" ],
    author: "Vex_Kshitiz",
    version: "1.0",
    cooldowns: 5,
    role: 1,
    shortDescription: "18+ TikTok video",
    longDescription: "18+ TikTok video",
    category: "18+",
    guide: "{p}porn"
  },

  onStart: async function ({ api, event, args, message }) {

    // 🔥 admin check
    const threadInfo = await api.getThreadInfo(event.threadID);
    const adminIDs = threadInfo.adminIDs.map(admin => admin.id);

    if (!adminIDs.includes(event.senderID)) {
      return api.sendMessage("❌ Only Groupadmin's can use this command.", event.threadID, event.messageID);
    }

    // Author check
    const isAuthorValid = await checkAuthor(module.exports.config.author);
    if (!isAuthorValid) {
      return message.reply("Author changer alert! This command belongs to Vex_Kshitiz.");
    }

    const apiUrl = "https://only-tik.vercel.app/kshitiz";

    try {
      const response = await axios.get(apiUrl);
      const { videoUrl, likes } = response.data;

      // Create cache folder if not exists
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }

      const tempVideoPath = path.join(cacheDir, `${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempVideoPath);

      const videoResponse = await axios.get(videoUrl, { responseType: "stream" });
      videoResponse.data.pipe(writer);

      writer.on("finish", () => {
        const stream = fs.createReadStream(tempVideoPath);
        message.reply({
          body: `❤️ Likes: ${likes}`,
          attachment: stream
        }, () => {
          fs.unlinkSync(tempVideoPath); // auto delete
        });
      });

      writer.on("error", (err) => {
        console.error("Writer error:", err);
        message.reply("Video download failed.");
      });

    } catch (error) {
      console.error("Error fetching OnlyTik video:", error);
      message.reply("Sorry, an error occurred while processing your request.");
    }
  }
};
