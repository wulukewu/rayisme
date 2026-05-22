const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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

// ====== 自動反壓榨（根據次數升級語氣）======
const antiPressureLevels = [
  // 1~3 次：淡定
  {
    maxCount: 3,
    replies: [
      (topic) => topic ? `${topic}？考慮一下` : '考慮一下',
      (topic) => topic ? `${topic}喔 懶得學` : '懶得學',
      () => '明天再說啦',
      () => '好啦好啦 考慮一下',
      (topic) => topic ? `${topic}太累了 改天` : '太累了 改天',
    ],
  },
  // 4~7 次：不耐煩
  {
    maxCount: 7,
    replies: [
      () => '又來？懶得理你',
      (topic) => topic ? `${topic}你自己先學好不好` : '你自己先學好不好',
      () => '你是不是沒別的話可以說了',
      () => '我考慮一下...算了不考慮了 不要',
      (topic) => topic ? `講了幾次了 ${topic}我不想學` : '講了幾次了 我不想學',
      () => '你有完沒完',
    ],
  },
  // 8~14 次：反擊
  {
    maxCount: 14,
    replies: [
      (topic) => topic ? `你那麼愛${topic} 你自己去學啊` : '你那麼愛 你自己去學啊',
      () => '壓榨上癮了是不是',
      () => '我覺得你比較需要學「尊重」',
      (topic) => topic ? `${topic}？我建議你先學「適可而止」` : '我建議你先學「適可而止」',
      () => '你看看你 壓榨次數都破紀錄了',
      () => '我已經從考慮一下升級到懶得考慮了',
    ],
  },
  // 15+ 次：嘲諷
  {
    maxCount: Infinity,
    replies: [
      (topic) => topic ? `恭喜 你成功讓我對${topic}產生心理陰影` : '恭喜 你成功讓我產生心理陰影',
      () => '壓榨之王 非你莫屬 要不要頒獎給你',
      () => '你的壓榨已經可以寫成論文了',
      () => '我建議你開一門課叫「如何用壓榨失去所有朋友」',
      () => '你壓榨的頻率比你寫 code 的頻率還高',
      () => '再壓榨一次我就去跟你媽說',
    ],
  },
];

function getAntiPressureReply(count, topic) {
  const level = antiPressureLevels.find((l) => count <= l.maxCount);
  return pickRandom(level.replies)(topic);
}

// ====== 考慮計時器（根據時間升級）======
function getTimerMessage(target, mins) {
  if (mins <= 5) {
    const msgs = [
      `${target} 說考慮一下已經 ${mins} 分鐘了，還在考慮嗎？`,
      `提醒 ${target}：你說的考慮一下已經 ${mins} 分鐘了喔`,
      `${target} 你考慮好了嗎？才 ${mins} 分鐘 我再等等`,
    ];
    return pickRandom(msgs);
  }
  if (mins <= 10) {
    const msgs = [
      `${mins} 分鐘了，${target} 你的「考慮一下」是不是其實是「不要」？`,
      `${target} 考慮了 ${mins} 分鐘，我開始覺得這個考慮不會有結果`,
      `已經 ${mins} 分鐘了 ${target} 你該不會忘了吧`,
    ];
    return pickRandom(msgs);
  }
  if (mins <= 20) {
    const msgs = [
      `${target} 的考慮進入第 ${mins} 分鐘，建議改名叫「拖延一下」`,
      `${mins} 分鐘了 我宣布 ${target} 的「考慮一下」正式過期`,
      `歷史記錄：${target} 曾考慮了 ${mins} 分鐘然後什麼都沒做`,
      `${mins} 分鐘 ${target} 你是在考慮還是在睡覺`,
    ];
    return pickRandom(msgs);
  }
  const msgs = [
    `⚠️ ${target} 已考慮 ${mins} 分鐘，系統判定為：懶得做`,
    `${mins} 分鐘了 我替 ${target} 翻譯：「我不會做但面子掛不住」`,
    `${target} 的考慮時間 ${mins} 分鐘，打破個人紀錄！上次好像也是什麼都沒做`,
    `最終報告：${target} 考慮了 ${mins} 分鐘，結論是他從來就沒打算做`,
  ];
  return pickRandom(msgs);
}

// ====== 壓榨回力鏢模板 ======
const boomerangTemplates = [
  (ray, topic) => `欸 ${ray} ${topic}要不要學一下？`,
  (ray, topic) => `${ray} 你${topic}看過了嗎？`,
  (ray, topic) => `我覺得 ${ray} 可以學一下${topic}耶`,
  (ray, topic) => `${ray} 你聽好：\n${topic}蠻重要的 你知道吧？`,
  (ray, topic) => `說到${topic} ${ray} 你是不是也不會？`,
  (ray, topic) => `${ray} 你壓榨別人學${topic} 但你自己學了嗎`,
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
let client;

function initBot(useMessageContent = true) {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ];

  if (useMessageContent) {
    intents.push(GatewayIntentBits.MessageContent);
    console.log('嘗試啟用 Message Content Intent...');
  } else {
    console.log('以安全相容模式啟動（無 Message Content Intent）...');
  }

  client = new Client({ intents });

  client.once('ready', () => {
    console.log(`反擊 Bot 已上線：${client.user.tag}`);
    if (useMessageContent) {
      console.log('✨ Message Content Intent 已啟用，自動偵測反壓榨功能運作中！');
    } else {
      console.warn('⚠️ 未啟用 Message Content Intent。目前僅支援 Slash 手動指令，自動偵測功能將不生效。');
    }
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
        const level =
          count < 4 ? '初級壓榨者 🟢' :
          count < 8 ? '慣性壓榨者 🟡' :
          count < 15 ? '壓榨成癮者 🟠' : '壓榨之王 🔴';

        const embed = new EmbedBuilder()
          .setTitle(`${target.username} 的壓榨戰績`)
          .addFields(
            { name: '壓榨次數', value: `**${count}** 次`, inline: true },
            { name: '等級', value: level, inline: true },
          )
          .setColor(count < 4 ? 0x00ff00 : count < 8 ? 0xffff00 : count < 15 ? 0xff8800 : 0xff0000)
          .setFooter({ text: '建議本人先把自己的事做完再壓榨別人' });

        await interaction.reply({ embeds: [embed] });
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
        content: `⏱️ 開始計時！${target} 說要「考慮一下」，我每 ${intervalMin} 分鐘提醒一次\n（時間越久我越不客氣）`,
      });

      const timerId = setInterval(() => {
        const mins = Math.round((Date.now() - startTime) / 60000);
        const msg = getTimerMessage(rayMention, mins);
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

      setTimeout(() => {
        if (considerTimers.has(target.id)) {
          clearInterval(considerTimers.get(target.id).timerId);
          considerTimers.delete(target.id);
          interaction.channel
            .send(`🏁 最終判決：${target} 考慮了 30 分鐘，結論是——他從來就沒打算做`)
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
        await interaction.reply({ content: '沒有在計時這個人啊' });
      }
    }

    // /幫助
    if (interaction.commandName === '幫助') {
      const embed = new EmbedBuilder()
        .setTitle('Rayisme Bot 使用說明')
        .setDescription('用 Ray 的人設反擊 Ray 的壓榨機器人')
        .addFields(
          {
            name: '🎭 模仿系列',
            value:
              '`/模仿ray 主題:Vue` — 產生一段 Ray 風格語錄\n' +
              '`/懶得 事情:debug` — 單發一句懶回應\n' +
              '`/考慮一下` — 連續轟炸「考慮一下」',
          },
          {
            name: '🛡️ 護航系統',
            value:
              '`/護航模式 保護對象:@你 反轉對象:@Ray` — 自動護航 + 反轉\n' +
              '`/停止護航` — 關掉護航',
          },
          {
            name: '📊 壓榨記錄',
            value:
              '`/戰績 對象:@Ray` — 查壓榨次數與等級\n' +
              '`/重置戰績 對象:@Ray` — 清除記錄',
          },
          {
            name: '⏱️ 考慮計時器',
            value:
              '`/考慮計時器 對象:@Ray` — 他說考慮一下？開始計時\n' +
              '`/停止計時 對象:@Ray` — 停止計時',
          },
          {
            name: '🤖 自動功能（不用下指令）',
            value:
              '• 偵測到對方 Bot 壓榨 → 自動回嘴（語氣隨次數升級）\n' +
              '• 壓榨回力鏢 → 抽出主題反彈給對方\n' +
              '• 偵測對方本人說「考慮」「懶得」→ 自動吐槽',
          },
        )
        .setColor(0x5865f2)
        .setFooter({ text: '需要 TARGET_BOT_ID / TARGET_USER_ID 才能啟用自動功能' });

      await interaction.reply({ embeds: [embed] });
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
    const isTargetBot = message.author.id === TARGET_BOT_ID;
    const isTargetUser = message.author.id === TARGET_USER_ID;
    const guard = guardConfig.get(message.channelId);

    const pressureKeywords = [
      '學嗎', '不學', '為什麼不', '不喜歡', '會用到',
      '要不要學', '蠻重要', '你說啊', '所以...學嗎',
    ];
    const isPressure = pressureKeywords.some((kw) => content.includes(kw));

    // === 功能 1：自動反壓榨（升級版）===
    if (isTargetBot && isPressure) {
      const count = addPressureCount(TARGET_USER_ID);
      const topic = extractTopic(content);

      await sleep(500 + Math.random() * 1000);
      await message.reply(getAntiPressureReply(count, topic));

      // 壓榨回力鏢
      if (topic && TARGET_USER_ID) {
        await sleep(1000 + Math.random() * 1000);
        const rayMention = `<@${TARGET_USER_ID}>`;
        await message.channel.send(pickRandom(boomerangTemplates)(rayMention, topic));
      }

      // 每 5 次壓榨加碼嘲諷
      if (count % 5 === 0) {
        await sleep(800);
        const milestones = [
          `📊 壓榨計數器：**${count}** 次。${TARGET_USER_ID ? `<@${TARGET_USER_ID}>` : '對方'} 你自己做了幾件事？`,
          `🏆 恭喜達成 ${count} 次壓榨成就！建議頒發「年度壓榨王」獎`,
          `📈 壓榨次數突破 **${count}**，這個頻率比他交作業還勤勞`,
        ];
        await message.channel.send(pickRandom(milestones));
      }

      return;
    }

    // === 功能 2：護航模式 ===
    if (guard && isPressure && !message.author.bot) {
      if (Date.now() > guard.expiresAt) {
        guardConfig.delete(message.channelId);
        return;
      }

      addPressureCount(message.author.id);

      await sleep(500 + Math.random() * 1000);

      const protectMention = `<@${guard.protectId}>`;
      const rayMention = `<@${guard.rayId}>`;
      const topic = extractTopic(content);
      const roll = Math.random();

      if (roll < 0.3) {
        await message.reply(pickRandom(praiseReplies)(protectMention));
      } else if (roll < 0.6) {
        await message.reply(pickRandom(reverseReplies)(rayMention));
      } else if (roll < 0.85) {
        await message.reply(pickRandom(praiseReplies)(protectMention));
        await sleep(800 + Math.random() * 800);
        await message.channel.send(pickRandom(reverseReplies)(rayMention));
      } else {
        if (topic) {
          await message.reply(pickRandom(boomerangTemplates)(rayMention, topic));
        } else {
          await message.reply(pickRandom(reverseReplies)(rayMention));
        }
      }

      return;
    }

    // === 功能 3：偵測對方本人說「考慮一下」或「懶得」===
    if (isTargetUser) {
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
          '你說的考慮一下 大家都知道是什麼意思',
        ];
        await message.reply(pickRandom(responses));
      }

      if (saidLazy && !saidConsider) {
        await sleep(1000 + Math.random() * 1500);
        const responses = [
          '知道 你什麼都懶',
          '懶的話就不要壓榨別人啊',
          '你看 連你自己都懶了 憑什麼叫別人學',
          '懶得弄 + 考慮一下 = 你的日常',
          '至少你很誠實',
          '你如果把懶的力氣拿去做事 早就做完了',
        ];
        await message.reply(pickRandom(responses));
      }
    }
  } catch (error) {
    console.error('處理訊息出錯：', error);
  }
});

  if (useMessageContent) {
    client.on('error', (error) => {
      if (error.message && (error.message.includes('disallowed intents') || error.message.includes('disallowed'))) {
        console.warn('⚠️ 偵測到 Discord Bot 未開啟 Message Content Intent 特權！將自動切換為相容模式重新連線...');
        client.destroy();
        setTimeout(() => initBot(false), 1000);
      } else {
        console.error('Client 發生錯誤：', error);
      }
    });
  }

  client.login(TOKEN).catch((error) => {
    if (useMessageContent && error.message && (error.message.includes('disallowed intents') || error.message.includes('disallowed'))) {
      console.warn('⚠️ 登入失敗（特權意圖未開啟），正在切換為相容模式重新連線...');
      client.destroy();
      setTimeout(() => initBot(false), 1000);
    } else {
      console.error('登入時發生錯誤：', error);
    }
  });
}

initBot(true);
