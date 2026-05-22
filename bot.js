const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const TARGET_BOT_ID = process.env.TARGET_BOT_ID || '';
const TARGET_USER_ID = process.env.TARGET_USER_ID || '';

// ====== Ray 語錄模板庫 ======

const lazyOpeners = [
  (topic) => `${topic}喔...`,
  (topic) => `${topic}？`,
  (topic) => `你說${topic}？`,
  (topic) => `嗯 ${topic}...`,
];

const lazyReplies = [
  (topic) => `懶得學${topic}`,
  (topic) => `${topic}喔 懶得弄`,
  () => '懶得看',
  () => '懶得動',
  () => '好累 懶得想',
  () => '太麻煩了 懶得弄',
  () => '懶得回你',
  () => '懶',
  (topic) => `${topic}感覺好複雜 懶得研究`,
  () => '改天再說 懶得處理',
];

const considerReplies = [
  () => '考慮一下',
  () => '我再考慮一下喔',
  () => '嗯...考慮一下',
  () => '這個要考慮一下',
  () => '讓我考慮一下',
  () => '好 我考慮看看',
  () => '考慮一下 明天跟你說',
  () => '我考慮一下 先不要',
  () => '欸 這個我要考慮一下耶',
  () => '考慮一下喔 不一定',
];

const rayClosers = [
  () => '反正就...懶得弄',
  () => '考慮一下',
  () => '再說啦',
  () => '明天再說',
  () => '不想動',
  () => '先這樣',
  () => '好累喔',
];

// ====== 護航語錄 ======
const praiseReplies = [
  (user) => `${user} 已經很厲害了好嗎`,
  (user) => `${user} 不用學啦 天生就會`,
  (user) => `幹嘛壓榨 ${user} 啦`,
  (user) => `${user} 是天才 不需要學這個`,
  (user) => `拜託 ${user} 什麼不會`,
  () => '不用學啦 又不會怎樣',
  () => '學那個幹嘛',
  () => '人家已經很努力了',
  () => '夠了啦 不要再逼了',
  () => '放過人家好不好',
];

// ====== UNO 反轉語錄 ======
const reverseReplies = [
  (ray) => `欸 ${ray} 你自己會嗎？`,
  (ray) => `不然 ${ray} 你先學給我看`,
  (ray) => `${ray} 你先做一個出來啊`,
  (ray) => `${ray} 與其壓榨別人 不如先壓榨自己`,
  (ray) => `${ray} 你上次不是說懶得學？`,
  (ray) => `${ray} 你不是都說考慮一下 結果從來沒考慮過`,
  (ray) => `${ray} 少壓榨人了 你自己先交作業`,
  (ray) => `說到這個 ${ray} 你是不是還有東西沒做完？`,
  (ray) => `${ray} 你自己都懶得弄了 還好意思叫別人學`,
];

// ====== 自動反壓榨語錄（用 Ray 口吻回嘴 pressure-bot）======
const antiPressureReplies = [
  () => '懶得學',
  () => '考慮一下',
  () => '明天再說啦',
  () => '好啦好啦 考慮一下',
  () => '懶得理你',
  () => '你先學啊',
  () => '我考慮一下...先不要',
  () => '太累了 改天',
  () => '不想動 懶',
  () => '嗯...懶得回',
];

// ====== 考慮一下計時器提醒 ======
const considerTimerMessages = [
  (ray, mins) => `${ray} 說考慮一下已經 ${mins} 分鐘了，還在考慮嗎？`,
  (ray, mins) => `${mins} 分鐘過去了，${ray} 大概忘了他在考慮什麼`,
  (ray, mins) => `已經 ${mins} 分鐘了 ${ray} 你考慮好了嗎`,
  (ray, mins) => `${ray} 的「考慮一下」已經持續 ${mins} 分鐘，破紀錄了`,
  (ray, mins) => `等了 ${mins} 分鐘，${ray} 應該是懶得考慮了`,
];

// ====== 壓榨回力鏢模板 ======
const boomerangTemplates = [
  (ray, topic) => `欸 ${ray} ${topic}要不要學一下？`,
  (ray, topic) => `${ray} 你${topic}看過了嗎？`,
  (ray, topic) => `我覺得 ${ray} 可以學一下${topic}耶`,
  (ray, topic) => `${ray} 你聽好：\n${topic}蠻重要的 你知道吧？`,
];

// ====== 系統狀態 ======
const guardConfig = new Map();
const pressureCount = new Map(); // { odjectId: count }
const considerTimers = new Map(); // { odjectId: { timerId, channelId, startTime } }

// ====== 工具函數 ======
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateRayQuote(topic) {
  const lines = [];
  lines.push(pickRandom(lazyOpeners)(topic));
  const allMiddle = [...lazyReplies, ...considerReplies];
  const selected = pickRandomN(allMiddle, 2 + Math.floor(Math.random() * 3));
  for (const fn of selected) {
    lines.push(fn(topic));
  }
  lines.push(pickRandom(rayClosers)());
  return lines;
}

function extractTopic(content) {
  const patterns = [
    /學(.+?)嗎/,
    /學一下(.+)/,
    /學(.+?)[？?]/,
    /(.+?)要不要學/,
    /(.+?)你看過/,
    /學一下(.+?)耶/,
    /可以學一下(.+)/,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function addPressureCount(userId) {
  const current = pressureCount.get(userId) || 0;
  pressureCount.set(userId, current + 1);
  return current + 1;
}

function getPressureCount(userId) {
  return pressureCount.get(userId) || 0;
}

// ====== Bot 主體 ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // GatewayIntentBits.MessageContent, // 暫時關閉此特權意圖以防止 "Used disallowed intents" 錯誤。若已在後台開啟此權限，可取消註解。
  ],
});

client.once('ready', () => {
  console.log(`反擊 Bot 已上線：${client.user.tag}`);
});

// ====== Slash Commands ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // /模仿ray
    if (interaction.commandName === '模仿ray') {
      const topic = interaction.options.getString('主題');
      const target = interaction.options.getUser('對象');
      const lines = generateRayQuote(topic);
      const firstLine = target
        ? `${target} 你聽 Ray 怎麼說的：\n${lines[0]}`
        : lines[0];
      await interaction.reply({ content: firstLine });
      for (let i = 1; i < lines.length; i++) {
        await sleep(800 + Math.random() * 1200);
        await interaction.channel.send(lines[i]);
      }
    }

    // /護航模式
    if (interaction.commandName === '護航模式') {
      const protectUser = interaction.options.getUser('保護對象');
      const rayUser = interaction.options.getUser('反轉對象');
      const minutes = interaction.options.getInteger('時間') || 5;
      const expiresAt = Date.now() + minutes * 60 * 1000;
      const key = interaction.channelId;

      guardConfig.set(key, {
        protectId: protectUser.id,
        rayId: rayUser.id,
        channelId: interaction.channelId,
        expiresAt,
      });

      await interaction.reply({
        content:
          `收到！接下來 ${minutes} 分鐘內：\n` +
          `🛡️ 有人壓榨 ${protectUser} → 我會護航\n` +
          `🔄 同時把壓力反轉給 ${rayUser}\n` +
          `🪃 壓榨回力鏢自動啟動\n` +
          `📊 壓榨次數全程記錄\n` +
          `讓我看看誰敢壓榨`,
      });

      setTimeout(() => {
        if (guardConfig.has(key)) {
          guardConfig.delete(key);
          interaction.channel
            .send('護航時間到，我先去懶一下')
            .catch(() => {});
        }
      }, minutes * 60 * 1000);
    }

    // /停止護航
    if (interaction.commandName === '停止護航') {
      const key = interaction.channelId;
      if (guardConfig.has(key)) {
        guardConfig.delete(key);
        await interaction.reply({ content: '好吧 護航結束 考慮一下要不要再開' });
      } else {
        await interaction.reply({ content: '我本來就沒在護航啊' });
      }
    }

    // /考慮一下
    if (interaction.commandName === '考慮一下') {
      const target = interaction.options.getUser('對象');
      const lines = pickRandomN(considerReplies, 3 + Math.floor(Math.random() * 3));
      const firstLine = target ? `${target}：${lines[0]()}` : lines[0]();
      await interaction.reply({ content: firstLine });
      for (let i = 1; i < lines.length; i++) {
        await sleep(1000 + Math.random() * 2000);
        await interaction.channel.send(lines[i]());
      }
    }

    // /懶得
    if (interaction.commandName === '懶得') {
      const thing = interaction.options.getString('事情');
      const target = interaction.options.getUser('對象');
      const responses = [
        `${thing}？懶得弄`,
        `懶得${thing}`,
        `你自己${thing}啦`,
        `${thing}好累 不想動`,
        `我考慮一下要不要${thing}...算了懶得考慮`,
      ];
      const reply = pickRandom(responses);
      const content = target ? `${target} ${reply}` : reply;
      await interaction.reply({ content });
    }

    // /戰績
    if (interaction.commandName === '戰績') {
      const target = interaction.options.getUser('對象');
      const count = getPressureCount(target.id);

      if (count === 0) {
        await interaction.reply({ content: `${target} 目前還沒有壓榨記錄...是在裝乖嗎` });
      } else {
        const comments = [
          `${target} 已經壓榨了 **${count}** 次，自己卻什麼都懶得做 :)`,
          `${target} 壓榨次數：**${count}** 次。建議本人先把自己的事做完`,
          `記錄顯示 ${target} 壓榨了 **${count}** 次。很閒齁？`,
          `${target} 的壓榨計數器：**${count}**。考慮一下自己要不要先學？`,
        ];
        await interaction.reply({ content: pickRandom(comments) });
      }
    }

    // /重置戰績
    if (interaction.commandName === '重置戰績') {
      const target = interaction.options.getUser('對象');
      pressureCount.delete(target.id);
      await interaction.reply({ content: `${target} 的壓榨記錄已清除，給你一次重新做人的機會` });
    }

    // /考慮計時器
    if (interaction.commandName === '考慮計時器') {
      const target = interaction.options.getUser('對象');
      const intervalMin = interaction.options.getInteger('間隔') || 5;

      if (considerTimers.has(target.id)) {
        await interaction.reply({ content: `已經在計時 ${target} 了，他還在考慮` });
        return;
      }

      const startTime = Date.now();
      const rayMention = `${target}`;

      await interaction.reply({
        content: `⏱️ 開始計時！${target} 說要「考慮一下」，我每 ${intervalMin} 分鐘提醒一次`,
      });

      const timerId = setInterval(() => {
        const mins = Math.round((Date.now() - startTime) / 60000);
        const msg = pickRandom(considerTimerMessages)(rayMention, mins);
        interaction.channel.send(msg).catch(() => {
          clearInterval(timerId);
          considerTimers.delete(target.id);
        });
      }, intervalMin * 60 * 1000);

      considerTimers.set(target.id, {
        timerId,
        channelId: interaction.channelId,
        startTime,
      });

      // 30 分鐘後自動停止
      setTimeout(() => {
        if (considerTimers.has(target.id)) {
          clearInterval(considerTimers.get(target.id).timerId);
          considerTimers.delete(target.id);
          interaction.channel
            .send(`${target} 考慮了 30 分鐘，結論大概是：懶得考慮`)
            .catch(() => {});
        }
      }, 30 * 60 * 1000);
    }

    // /停止計時
    if (interaction.commandName === '停止計時') {
      const target = interaction.options.getUser('對象');
      const timer = considerTimers.get(target.id);

      if (timer) {
        const mins = Math.round((Date.now() - timer.startTime) / 60000);
        clearInterval(timer.timerId);
        considerTimers.delete(target.id);
        await interaction.reply({
          content: `${target} 的考慮時間：${mins} 分鐘。結果呢？大概還是懶得弄`,
        });
      } else {
        await interaction.reply({ content: `沒有在計時這個人啊` });
      }
    }
  } catch (error) {
    console.error('執行指令出錯：', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '執行指令時發生錯誤，請再試一次！', ephemeral: true });
      }
    } catch (e) {
      console.error('無法發送錯誤回覆：', e);
    }
  }
});

// ====== 自動監聽系統 ======
client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  try {
    const content = message.content;
    const isRayBot = message.author.id === TARGET_BOT_ID;
    const isRay = message.author.id === TARGET_USER_ID;
    const guard = guardConfig.get(message.channelId);

    // --- 壓榨關鍵字偵測 ---
    const pressureKeywords = [
      '學嗎', '不學', '為什麼不', '不喜歡', '會用到',
      '要不要學', '蠻重要', '你說啊', '所以...學嗎',
    ];
    const isPressure = pressureKeywords.some((kw) => content.includes(kw));

    // === 功能 1：自動反壓榨（偵測 pressure-bot 的訊息，用 Ray 口吻回嘴）===
    if (isRayBot && isPressure) {
      addPressureCount(TARGET_USER_ID);

      await sleep(500 + Math.random() * 1000);
      await message.reply(pickRandom(antiPressureReplies)());

      // 壓榨回力鏢：抓出主題，反彈給 Ray
      const topic = extractTopic(content);
      if (topic && TARGET_USER_ID) {
        await sleep(1000 + Math.random() * 1000);
        const rayMention = `<@${TARGET_USER_ID}>`;
        await message.channel.send(pickRandom(boomerangTemplates)(rayMention, topic));
      }

      // 每 5 次壓榨加碼嘲諷
      const count = getPressureCount(TARGET_USER_ID);
      if (count % 5 === 0 && count > 0) {
        await sleep(800);
        await message.channel.send(
          `📊 提醒一下，壓榨計數器已經到 **${count}** 次了。${TARGET_USER_ID ? `<@${TARGET_USER_ID}>` : 'Ray'} 你自己做了幾件事？`
        );
      }

      return;
    }

    // === 功能 2：護航模式（偵測任何人壓榨被保護的人）===
    if (guard && isPressure && !message.author.bot) {
      if (Date.now() > guard.expiresAt) {
        guardConfig.delete(message.channelId);
        return;
      }

      addPressureCount(message.author.id);

      await sleep(500 + Math.random() * 1000);

      const protectMention = `<@${guard.protectId}>`;
      const rayMention = `<@${guard.rayId}>`;

      // 護航 + 反轉 + 回力鏢
      const roll = Math.random();

      if (roll < 0.3) {
        // 純護航
        await message.reply(pickRandom(praiseReplies)(protectMention));
      } else if (roll < 0.6) {
        // 純反轉
        await message.reply(pickRandom(reverseReplies)(rayMention));
      } else if (roll < 0.85) {
        // 護航 + 反轉
        await message.reply(pickRandom(praiseReplies)(protectMention));
        await sleep(800 + Math.random() * 800);
        await message.channel.send(pickRandom(reverseReplies)(rayMention));
      } else {
        // 回力鏢：把壓榨原封不動轉給 Ray
        const topic = extractTopic(content);
        if (topic) {
          await message.reply(pickRandom(boomerangTemplates)(rayMention, topic));
        } else {
          await message.reply(pickRandom(reverseReplies)(rayMention));
        }
      }

      return;
    }

    // === 功能 3：偵測 Ray 本人說「考慮一下」或「懶得」===
    if (isRay) {
      const saidConsider = content.includes('考慮') || content.includes('想一下') || content.includes('再說');
      const saidLazy = content.includes('懶得') || content.includes('懶') || content.includes('不想動');

      if (saidConsider) {
        await sleep(1000 + Math.random() * 1500);
        const responses = [
          '又考慮一下？上次考慮到現在了',
          '你的「考慮一下」= 不會做',
          '考慮？你是不是又要拖到忘記',
          '翻譯：我不想做但不好意思直說',
          '考慮一下計時開始 ⏱️',
        ];
        await message.reply(pickRandom(responses));
      }

      if (saidLazy && !saidConsider) {
        await sleep(1000 + Math.random() * 1500);
        const responses = [
          '知道 你什麼都懶',
          '懶的話就不要壓榨別人啊',
          '你看 連你自己都懶了 憑什麼叫別人學',
          '懶得弄 + 考慮一下 = Ray 的日常',
          '至少你很誠實',
        ];
        await message.reply(pickRandom(responses));
      }
    }
  } catch (error) {
    console.error('處理訊息出錯：', error);
  }
});

client.login(TOKEN);
