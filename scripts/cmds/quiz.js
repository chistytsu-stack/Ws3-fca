const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get(
    `https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`
  );
  return base.data.api;
};

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz", "quiz"],
    version: "3.0",
    author: "Mashrafi",
    countDown: 0,
    role: 0,
    category: "game",
    guide: "{p}quiz \n{pn}quiz bn \n{p}quiz en",
  },

  onStart: async function ({ api, event, usersData, args }) {
    const input = args.join('').toLowerCase() || "bn";
    let timeout = 300;
    let category = "bangla";

    if (input === "bn" || input === "bangla") {
      category = "bangla";
    } else if (input === "en" || input === "english") {
      category = "english";
    }

    try {
      const response = await axios.get(
        `${await baseApiUrl()}/quiz?category=${category}&q=random`
      );

      const quizData = response.data.question;
      const { question, correctAnswer, options } = quizData;
      const { a, b, c, d } = options;
      const namePlayer = await usersData.getName(event.senderID);

      const quizMsg = {
        body: `🧠 QUIZ TIME, ${namePlayer}!\n\n👉 ${question}\n\nA) ${a}\nB) ${b}\nC) ${c}\nD) ${d}\n\n⚡ Reply with A/B/C/D & show off ur brain 🤯`,
      };

      api.sendMessage(
        quizMsg,
        event.threadID,
        (error, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            type: "reply",
            commandName: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            dataGame: quizData,
            correctAnswer,
            nameUser: namePlayer
          });
          setTimeout(() => {
            api.unsendMessage(info.messageID);
          }, timeout * 1000);
        },
        event.messageID
      );
    } catch (error) {
      console.error("❌ | Error occurred:", error);
      api.sendMessage("Bruh, API bugged rn 💀\n\n" + error.message, event.threadID, event.messageID);
    }
  },

  onReply: async ({ event, api, Reply, usersData }) => {
    const { correctAnswer, nameUser, author } = Reply;
    if (event.senderID !== author)
      return api.sendMessage("💀 This ain’t ur quiz fam, chill.", event.threadID, event.messageID);

    switch (Reply.type) {
      case "reply": {
        let userReply = event.body.trim().toLowerCase();

        if (userReply === correctAnswer.toLowerCase()) {
          api.unsendMessage(Reply.messageID).catch(console.error);

          let rewardCoins = 300;
          let rewardExp = 100;
          let userData = await usersData.get(author);
          await usersData.set(author, {
            money: userData.money + rewardCoins,
            exp: userData.exp + rewardExp,
            data: userData.data,
          });

          let correctMsg = `🔥 SHEEEESH ${nameUser}!\n✅ Correct Answer 👉 ${correctAnswer}\n\n+${rewardCoins} Coins 💰\n+${rewardExp} EXP ⚡\n\nBig brain energy 🧠💎`;
          api.sendMessage(correctMsg, event.threadID, event.messageID);
        } else {
          api.unsendMessage(Reply.messageID).catch(console.error);
          let wrongMsg = `🚫 Nah fam, wrong answer.\n✅ Real Answer 👉 ${correctAnswer}\n\nBetter luck next round 🤡✨`;
          api.sendMessage(wrongMsg, event.threadID, event.messageID);
        }
        break;
      }
      default:
        break;
    }
  },
};
