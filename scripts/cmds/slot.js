const fruitEmojis = ["🍒", "🍇", "🍊", "🍉", "🍎", "🍓", "🍏", "🍌", "💎", "💀"];

function formatMoney(number) {
  const units = [
    { label: 'Dc', value: 1e33 }, { label: 'Nn', value: 1e30 }, { label: 'Oc', value: 1e27 },
    { label: 'Sp', value: 1e24 }, { label: 'Sx', value: 1e21 }, { label: 'Qi', value: 1e18 },
    { label: 'Qa', value: 1e15 }, { label: 'T', value: 1e12 }, { label: 'B', value: 1e9 },
    { label: 'M', value: 1e6 }, { label: 'K', value: 1e3 }
  ];
  for (const unit of units) {
    if (number >= unit.value) return (number / unit.value).toFixed(2) + unit.label;
  }
  return number.toLocaleString();
}

function parseBet(input) {
  if (!input) return NaN;
  const match = input.toLowerCase().match(/^([\d.]+)([a-z]*)$/);
  if (!match) return NaN;
  const num = parseFloat(match[1]);
  const multipliers = {
    k: 1e3, m: 1e6, b: 1e9, t: 1e12,
    qa: 1e15, qi: 1e18, sx: 1e21, sp: 1e24,
    oc: 1e27, nn: 1e30, dc: 1e33
  };
  const suffix = match[2];
  return Math.floor(num * (multipliers[suffix] || 1));
}

module.exports = {
  config: {
    name: "slot",
    version: "1.7",
    author: "TawsiN",
    countDown: 5,
    role: 0,
    shortDescription: "Play slot machine",
    longDescription: "Try your luck with the slot machine. Win or lose big.",
    category: "game",
    guide: "{pn} [amount] | stats | reset | reset -g"
  },

  onStart: async function ({ api, args, event, usersData, message }) {

    const { senderID } = event;
    const userData = await usersData.get(senderID);
    const arg = args[0]?.toLowerCase();

    // RESET
    if (arg === "reset") {
      const isGlobal = args.includes("-g");

      if (isGlobal) {
        if (senderID !== "100080195076753")
          return message.reply("You don't have permission to globally reset stats.");

        const allUsers = await usersData.getAll();
        for (const user of allUsers) {
          if (user.data?.slotStats) {
            user.data.slotStats = undefined;
            await usersData.set(user.userID, { data: user.data });
          }
        }
        return message.reply("All slot stats globally reset.");
      }

      userData.data.slotStats = undefined;
      await usersData.set(senderID, { data: userData.data });
      return message.reply("Your slot stats reset.");
    }

    // STATS
    if (arg === "stats") {
      const stats = userData.data.slotStats;
      if (!stats) return message.reply("No slot stats yet. Spin first.");

      const net = stats.earned - stats.lostMoney;
      const totalGames = stats.won + stats.lost;
      const winRate = totalGames > 0 ? ((stats.won / totalGames) * 100).toFixed(2) : "0.00";

      return message.reply(
        `Wins: ${stats.won}\n` +
        `Losses: ${stats.lost}\n` +
        `Win Rate: ${winRate}%\n` +
        `Total Won: ${formatMoney(stats.earned)}$\n` +
        `Total Lost: ${formatMoney(stats.lostMoney)}$\n` +
        `Net: ${formatMoney(net)}$`
      );
    }

    // MAIN SLOT PLAY
    const bet = parseBet(arg);
    if (isNaN(bet)) return message.reply("Enter valid bet amount. Example: /slot 500k");
    if (bet < 200) return message.reply("Minimum bet: 200 coins.");
    if (bet > userData.money)
      return message.reply(`Not enough balance. Your balance: ${formatMoney(userData.money)}$`);

    if (!userData.data.slotStats) {
      userData.data.slotStats = { won: 0, lost: 0, earned: 0, lostMoney: 0 };
    }

    const slots = [getFruit(), getFruit(), getFruit()];
    const result = calculateWinnings(slots, bet, userData.data.slotStats);

    const newBalance = userData.money + result.amount;
    const stats = userData.data.slotStats;

    if (result.amount > 0) {
      stats.won++;
      stats.earned += result.amount;
    } else {
      stats.lost++;
      stats.lostMoney += -result.amount;
    }

    await usersData.set(senderID, { money: newBalance, data: userData.data });

    const slotLine = `${slots.join(" | ")}`;
    let output = `${slotLine}\nYou bet ${formatMoney(bet)}$ and `;

    if (result.type === "jackpot") output += `won ${formatMoney(result.amount)}$ — JACKPOT! 💰`;
    else if (result.type === "diamond") output += `won ${formatMoney(result.amount)}$ with rare diamonds! 💎`;
    else if (result.amount > 0) output += `won ${formatMoney(result.amount)}$. Nice win.`;
    else if (result.type === "skull") output += `lost ${formatMoney(-result.amount)}$. 💀 Very unlucky.`;
    else output += `lost ${formatMoney(-result.amount)}$. Try again.`;

    return message.reply(output);
  }
};

function getFruit() {
  const weighted = ["🍒", "🍇", "🍊", "🍉", "🍎", "🍓", "🍏", "🍌", "💎", "💀"];
  const weights = [8, 8, 8, 8, 8, 8, 8, 8, 3, 0.3];
  const total = weights.reduce((a, b) => a + b, 0);

  let rand = Math.random() * total;
  for (let i = 0; i < weighted.length; i++) {
    rand -= weights[i];
    if (rand < 0) return weighted[i];
  }
  return "🍇";
}

function calculateWinnings([a, b, c], bet, stats) {

  const winMultipliers = [1, 2, 3, 5, 10];
  const loseMultipliers = [1, 2];
  const skullMultipliers = [1, 2, 3];

  const wins = stats?.won || 0;
  const losses = stats?.lost || 0;

  // 4 wins → force loss
  if (wins > 0 && wins % 4 === 0) {
    const skull = Math.random() < 0.3;
    const penalty = skull
      ? -bet * skullMultipliers[Math.floor(Math.random() * skullMultipliers.length)]
      : -bet * loseMultipliers[Math.floor(Math.random() * loseMultipliers.length)];
    return { amount: penalty, type: skull ? "skull" : "loss" };
  }

  // 3 losses → force win
  if (losses > 0 && losses % 3 === 0) {
    return {
      amount: bet * winMultipliers[Math.floor(Math.random() * winMultipliers.length)],
      type: "normal"
    };
  }

  // JACKPOT
  if (a === b && b === c && a === "💎")
    return { amount: bet * 30, type: "jackpot" };

  // Diamond double
  if ((a === "💎" && b === "💎") || (a === "💎" && c === "💎") || (b === "💎" && c === "💎"))
    return { amount: bet * 20, type: "diamond" };

  // Triple match
  if (a === b && b === c)
    return { amount: bet * winMultipliers[Math.floor(Math.random() * winMultipliers.length)], type: "normal" };

  // Double match
  if (a === b || a === c || b === c)
    return { amount: bet * winMultipliers[Math.floor(Math.random() * 3)], type: "normal" };

  // LOSS
  const skull = [a, b, c].includes("💀");
  const penalty = skull
    ? -bet * skullMultipliers[Math.floor(Math.random() * skullMultipliers.length)]
    : -bet * loseMultipliers[Math.floor(Math.random() * loseMultipliers.length)];

  return { amount: penalty, type: skull ? "skull" : "loss" };
}
