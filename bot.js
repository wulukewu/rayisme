const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
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
const fightConfig = new Map(); // channelId -> { targetId, expiresAt, count, timerId }

let baseBP = 0; // 基礎血壓值 (0-100)
let lastBPUpdateTime = Date.now(); // 上次血壓更新時間

function getRayBloodPressure() {
  const hoursPassed = (Date.now() - lastBPUpdateTime) / (60 * 60 * 1000);
  const decay = Math.floor(hoursPassed) * 5;
  return Math.max(0, baseBP - decay);
}

function increaseRayBloodPressure(amount) {
  const current = getRayBloodPressure();
  baseBP = Math.min(100, current + amount);
  lastBPUpdateTime = Date.now();
  saveData();
}

// ====== 對線模式漸進式語錄 ======
const fightReplies = {
  // 1~3 次：淡定敷衍 🟢
  low: [
    () => '嗯...',
    () => '喔。',
    () => '隨便啦。',
    () => '懶得回你。',
    () => '好累喔，隨便你怎麼說。',
    () => '明天再說啦，今天不想動腦。',
    () => '你高興就好。',
  ],
  // 4~7 次：逐漸暴躁 🟡
  medium: [
    (target) => `欸 ${target}，你話很多耶...`,
    () => '打字很累知道嗎？可以不要一直傳嗎？',
    () => '考慮一下先閉嘴好不好？',
    () => '（已對您開啟靜音模式 🔇，雖然我還是自動回了這句）',
    () => '你是不是很閒？我很累耶。',
    () => '反正就...懶得理你。',
    () => '我有權保持沉默，但我更想叫你閉嘴。',
  ],
  // 8+ 次：靈魂大反擊 🔴
  high: [
    (target) => `你那麼有活力跟我對線，怎麼不去幫大家寫 code？`,
    (target) => `${target} 的打字速度快到我心跳加速，我考慮一下要不要去跟你媽說你很吵。`,
    () => '我打字好累喔，你自己跟牆壁對線啦！',
    () => '恭喜你成功讓我進入『懶得搭理』終極擺爛狀態。',
    () => '你的打字速度如果拿去寫報告，現在應該已經財富自由了。',
    () => '我決定把你的頭像打馬賽克，因為你的廢話太耀眼了。',
    () => '再吵一句，我就考慮一下明天不讓你點午餐。',
  ],
};

function getFightReply(count, targetMention) {
  if (count <= 3) {
    return pickRandom(fightReplies.low)();
  }
  if (count <= 7) {
    return pickRandom(fightReplies.medium)(targetMention);
  }
  return pickRandom(fightReplies.high)(targetMention);
}

// ====== 敷衍翻譯功能 ======
function translateToRay(text) {
  let topic = text.trim();
  if (topic.length > 10) {
    topic = topic.substring(0, 8) + '...';
  }
  
  const lazyOpeners = [
    `${topic}喔...`,
    `${topic}？`,
    `你說${topic}？`,
    `嗯 ${topic}...`,
  ];
  
  const lazyReplies = [
    `懶得弄啦`,
    `感覺好複雜 懶得研究`,
    `好累 懶得想`,
    `太麻煩了 懶得理`,
    `改天再說 懶得處理`,
  ];

  const considerReplies = [
    `我考慮一下 先不要`,
    `這個我要考慮一下耶`,
    `我再考慮一下喔`,
    `考慮一下 明天跟你說`,
  ];

  const rayClosers = [
    `反正就...懶得弄`,
    `考慮一下`,
    `再說啦`,
    `明天再說`,
    `不想動`,
    `好累喔`,
  ];

  const opener = pickRandom(lazyOpeners);
  const replies = pickRandomN([...lazyReplies, ...considerReplies], 2);
  const closer = pickRandom(rayClosers);

  return `🥱 **Ray 風格翻譯結果：**\n「${opener} ${replies[0]}，${replies[1]}，${closer}。」`;
}

// ====== 抓戰犯語錄 ======
const scapegoatExcuses = [
  (target, issue) => `關於「${issue}」這件事，我看了看，這絕對是 ${target} 的責任。他上次寫 code 的時候多打了一個空白鍵，直接把整個專案的氣場給震碎了。`,
  (target, issue) => `「${issue}」是吧？我合理的推斷這是 ${target} 的陰謀。他一定是在偷偷學 Vue 的時候忘記繳交作業，導致伺服器產生了強烈的幽怨感。`,
  (target, issue) => `這還用問？「${issue}」肯定是 ${target} 的鍋。我今天根本沒開電腦，難道會是我的錯？我只是個無辜的 Bot 耶。`,
  (target, issue) => `關於「${issue}」，我建議把 ${target} 抓去寫一整天的 Vue。因為根據風水推算，他今天命格缺 code，適合背鍋。`,
  (target, issue) => `很明顯，「${issue}」是因為 ${target} 的頭像太過於耀眼，干擾了編譯器的紅外線感應。`,
  (target, issue) => `不要找我，這件事情「${issue}」絕對是因為 ${target} 偷偷壓榨別人學 R 語言，引發了宇宙級的反彈能量。`,
  (target, issue) => `我考慮了一下，「${issue}」應該是 ${target} 昨晚睡覺姿勢不對，導致今天大家寫程式碼都遇到了瓶頸。`,
  (target, issue) => `別急著抓，「${issue}」我們先放著改天再說。真的要找戰犯的話，我選 ${target}，因為他看起來最不會反抗。`,
];

// ====== 地表最強請假理由 ======
const leaveExcuses = [
  '我的鍵盤今天早上突然失去了活下去的勇氣，它躺在那裡一動不動，我需要留在家裡開導它，今天請假一天。',
  '昨天夢到 Vue 的官方文檔跟我說它今天不想上班。為了尊重底層技術，我考慮了一下決定在家陪它擺爛。',
  '今天早上出門發現風向不對，打開 VS Code 可能會引發強烈的磁場混亂，為了公司主機與程式碼的安全，我決定請假避難。',
  '我的手指今天突然想去探索宇宙的奧秘，它們拒絕觸碰鍵盤。為了不勉強它們，我決定今天放它們假。',
  '床今天早上對我發動了強力的封印魔法，我掙扎了三個小時依然無法解除，今天被迫在家休養。',
  '我今天起床的時候照鏡子，發現自己今天的命格不適合開會，為了大家的專案運勢，我考慮了一下先不要去公司。',
  '今天下雨，雨滴敲打窗戶的聲音在暗示我：『改天再說』。我覺得不應該違背自然的旨意。',
  '我的靈魂跟我說它已經累積了 120% 的怨念值，如果今天去上班，有可能會直接進化成「離職之王」，為了大家的和平，我今天先在家靜養。',
];

// ====== 下班倒數計算與語錄 ======
function getOffWorkMessage() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  if (currentHour >= 18 || currentHour < 9) {
    return `🥱 **下班倒數：**\n「現在已經是下班時間了！我的靈魂早已不在此地，大腦已進入防禦性擺爛狀態。有事明天再說，今天不想動腦。」`;
  }

  const targetHour = 18;
  const remainingMins = (targetHour * 60) - (currentHour * 60 + currentMin);

  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;

  const progressBars = [
    `[████░░░░░░] 40% (摸魚黃金期) 摸魚中 🐟`,
    `[████████░░] 80% (準備收拾包包) 收拾中 🎒`,
    `[██████████] 100% (蓄勢待發，準備閃現) 閃現冷卻中 ⚡`,
    `[█░░░░░░░░░] 10% (剛開始上班，極度痛苦) 痛苦挣扎中 😭`,
    `[██░░░░░░░░] 20% (午餐吃什麼是唯一動力) 思考午餐中 🍔`
  ];

  let bar = progressBars[3];
  if (hours < 1) bar = progressBars[2];
  else if (hours < 2) bar = progressBars[1];
  else if (hours < 4) bar = progressBars[0];
  else if (hours >= 6) bar = progressBars[3];
  else bar = progressBars[4];

  const templates = [
    `距離下班還有 **${hours}** 小時 **${mins}** 分鐘。偷偷跟你說，我的 IDE 其實已經關閉很久了，目前純粹用意志力在裝忙。`,
    `距離下班還有 **${hours}** 小時 **${mins}** 分鐘！我已經在把手放鍵盤上擺拍了，只要時間一到，我就會發動瞬間移動直接消失。`,
    `還有 **${hours}** 小時 **${mins}** 分鐘下班。建議這個時候不要問我任何重要問題，因為我的大腦已經提前關機了。`,
    `還有 **${hours}** 小時 **${mins}** 分鐘...我考慮了一下，覺得這段時間很適合拿來發呆，隨便啦。`,
    `下班倒數：**${hours}** 小時 **${mins}** 分鐘。此時此刻的我不適合動腦，好累喔。`
  ];

  const text = pickRandom(templates);
  return `⏱️ **靈魂下班倒數中...**\n${bar}\n\n「${text}」`;
}

const DATA_FILE = './data.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      
      if (parsed.pressureCount && typeof parsed.pressureCount === 'object') {
        // 新格式
        for (const [key, value] of Object.entries(parsed.pressureCount)) {
          pressureCount.set(key, value);
        }
        baseBP = typeof parsed.baseBP === 'number' ? parsed.baseBP : 0;
        lastBPUpdateTime = typeof parsed.lastBPUpdateTime === 'number' ? parsed.lastBPUpdateTime : Date.now();
      } else {
        // 舊格式相容（整個 JSON 就是壓榨次數的 Map）
        for (const [key, value] of Object.entries(parsed)) {
          pressureCount.set(key, value);
        }
        baseBP = 0;
        lastBPUpdateTime = Date.now();
      }
      console.log('📊 歷史資料載入成功！');
    }
  } catch (error) {
    console.error('載入歷史資料失敗：', error);
  }
}

function saveData() {
  try {
    const obj = {
      pressureCount: Object.fromEntries(pressureCount),
      baseBP,
      lastBPUpdateTime,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (error) {
    console.error('儲存歷史資料失敗：', error);
  }
}

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
  // Strip mentions first
  let cleanContent = content.replace(/<@!?\d+>/g, '').trim();

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
    const m = cleanContent.match(p);
    if (m && m[1]) {
      let topic = m[1].trim();
      
      // Clean up punctuation and helper particles at the start/end of the extracted topic
      topic = topic.replace(/^[?？!！.。 ,，、\/\\_~+\-*]+/, '');
      topic = topic.replace(/[?？!！.。 ,，、\/\\_~+\-*]+$/, '');
      topic = topic.replace(/[嗎嘛吧呢啦呀啊哇]$/, '').trim();
      
      const stopWords = [
        '嗎', '么', '嘛', '呢', '啦', '吧', '呀', '哇', '啊',
        '學', '不', '會', '能', '寫', '做', '弄',
        '這個', '那個', '什麼', '怎麼', '誰', '哪',
        '學不學', '會不會', '能不能', '是不是', '要不要'
      ];
      if (stopWords.includes(topic)) continue;
      
      // Filter out single character verbs/particles in Chinese
      if (topic.length === 1 && /[\u4e00-\u9fa5]/.test(topic)) {
        const commonVerbsAndParticles = /^[學寫做弄看不聽說去來買用會能要想可好怕難懶嗎]$/;
        if (commonVerbsAndParticles.test(topic)) continue;
      }
      
      if (!topic) continue;
      
      return topic;
    }
  }
  return null;
}

function addPressureCount(userId) {
  const current = pressureCount.get(userId) || 0;
  pressureCount.set(userId, current + 1);
  saveData();
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
      baseBP = 0;
      lastBPUpdateTime = Date.now();
      saveData();
      await interaction.reply({ content: `${target} 的壓榨記錄已清除，同時也為 Ray 降壓成功，給你一次重新做人的機會 😌` });
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
            name: '🎭 模仿與翻譯系列',
            value:
              '`/模仿ray 主題:Vue` — 產生一段 Ray 風格語錄\n' +
              '`/懶得 事情:debug` — 單發一句懶回應\n' +
              '`/考慮一下` — 連續轟炸「考慮一下」\n' +
              '`/敷衍翻譯 內容:明天要開會` — 將任何話翻譯成擺爛風格 🥱',
          },
          {
            name: '🛡️ 護航與對線系統',
            value:
              '`/護航模式 保護對象:@你 反轉對象:@Ray` — 自動護航 + 反轉\n' +
              '`/停止護航` — 關掉護航\n' +
              '`/對線模式 對象:@誰 時間:5` — 鎖定某人，每句話都嘴回去 ⚔️\n' +
              '`/停止對線` — 結束對線模式',
          },
          {
            name: '📈 擺爛與趣味系列',
            value:
              '`/血壓` — 查看 Ray 當前的血壓值與擺爛指數 📈\n' +
              '`/抓戰犯 問題:壞了 對象:@誰` — 推卸責任，指控完美的戰犯 🛡️\n' +
              '`/下班倒數` — 計算距離靈魂下班（18:00）還有多久 ⏱️\n' +
              '`/請假理由` — 產生一個地表最強、極具創意的請假藉口 🥱',
          },
          {
            name: '📊 壓榨記錄',
            value:
              '`/戰績 對象:@Ray` — 查壓榨次數與等級\n' +
              '`/重置戰績 對象:@Ray` — 清除記錄，同時為 Ray 降壓 😌',
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
              '• 偵測對方本人說「考慮」「懶得」→ 自動吐槽\n' +
              '• 對線模式開啟下 → 目標只要說任何話都會被動態嘴回去 💬\n' +
              '• 高血壓疲憊模式 → 當血壓 $\\ge 80$ 時，任何人說話皆有 15% 機率觸發 Ray 疲憊的已讀不回或抱怨回應 🌡️',
          },
        )
        .setColor(0x5865f2)
        .setFooter({ text: '需要 TARGET_BOT_ID / TARGET_USER_ID 才能啟用自動功能' });

      await interaction.reply({ embeds: [embed] });
    }

    // /對線模式
    if (interaction.commandName === '對線模式') {
      const target = interaction.options.getUser('對象');
      const minutes = interaction.options.getInteger('時間') || 5;
      const expiresAt = Date.now() + minutes * 60 * 1000;
      const key = interaction.channelId;

      // 如果該頻道已有對線，先清除舊的計時器
      const existing = fightConfig.get(key);
      if (existing && existing.timerId) {
        clearTimeout(existing.timerId);
      }

      // 設定主動停火計時器
      const timerId = setTimeout(() => {
        if (fightConfig.has(key)) {
          fightConfig.delete(key);
          interaction.channel
            .send(`⚔️ 時間到了，我懶得跟 <@${target.id}> 對線了，放學！`)
            .catch(() => {});
        }
      }, minutes * 60 * 1000);

      fightConfig.set(key, {
        targetId: target.id,
        expiresAt,
        count: 0,
        timerId,
      });

      await interaction.reply({
        content: `⚔️ 對線模式啟動！接下來 ${minutes} 分鐘內，我會反擊 ${target} 說的每一句話 😈\n（請注意：回嘴的不耐煩程度會隨著次數升級！）`,
      });
    }

    // /停止對線
    if (interaction.commandName === '停止對線') {
      const key = interaction.channelId;
      const existing = fightConfig.get(key);
      if (existing) {
        if (existing.timerId) {
          clearTimeout(existing.timerId);
        }
        fightConfig.delete(key);
        await interaction.reply({ content: '好吧，先放你一馬，我懶得吵了。' });
      } else {
        await interaction.reply({ content: '我又沒在跟誰對線，你急什麼？' });
      }
    }

    // /敷衍翻譯
    if (interaction.commandName === '敷衍翻譯') {
      const content = interaction.options.getString('內容');
      const result = translateToRay(content);
      await interaction.reply({ content: result });
    }

    // /血壓
    if (interaction.commandName === '血壓') {
      const bp = getRayBloodPressure();
      const barLength = Math.round(bp / 10);
      const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
      
      let status = '健康 🟢 (極度放鬆，目前大概在睡覺或打荒野亂鬥)';
      let color = 0x00ff00;
      if (bp >= 80) {
        status = '危險 🔴 (極度暴躁！大腦處於離職邊緣，對所有訊息有 15% 機率回以抱怨！)';
        color = 0xff0000;
      } else if (bp >= 60) {
        status = '偏高 🟠 (血壓上升，隨時可能已讀不回或開啟防禦性擺爛)';
        color = 0xff8800;
      } else if (bp >= 30) {
        status = '稍微疲憊 🟡 (開始覺得工作沒意思，考慮要不要裝病請假)';
        color = 0xffff00;
      }

      const embed = new EmbedBuilder()
        .setTitle('📈 Ray 的即時血壓與擺爛指數')
        .addFields(
          { name: '當前血壓值', value: `**${bp}** / 100`, inline: true },
          { name: '健康狀態評估', value: status, inline: false },
          { name: '擺爛狀態量表', value: `\`[${bar}]\` **${bp}%**`, inline: false }
        )
        .setColor(color)
        .setFooter({ text: '血壓每小時會自然下降 5 點（若沒有人壓榨他的話）' });

      await interaction.reply({ embeds: [embed] });
    }

    // /抓戰犯
    if (interaction.commandName === '抓戰犯') {
      const issue = interaction.options.getString('問題');
      let targetUser = interaction.options.getUser('對象');

      if (!targetUser) {
        const members = Array.from(interaction.guild.members.cache.values()).filter((m) => !m.user.bot);
        if (members.length > 0) {
          targetUser = pickRandom(members).user;
        } else {
          targetUser = interaction.user;
        }
      }

      const targetMention = `<@${targetUser.id}>`;
      const excuse = pickRandom(scapegoatExcuses)(targetMention, issue);

      await interaction.reply({ content: `🛡️ **戰犯調查報告：**\n${excuse}` });
    }

    // /下班倒數
    if (interaction.commandName === '下班倒數') {
      const msg = getOffWorkMessage();
      await interaction.reply({ content: msg });
    }

    // /請假理由
    if (interaction.commandName === '請假理由') {
      const excuse = pickRandom(leaveExcuses);
      await interaction.reply({
        content: `🥱 **經過深度考慮後的完美請假理由：**\n「${excuse}」`,
      });
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
    // === 功能 0：對線模式 ===
    const fight = fightConfig.get(message.channelId);
    if (fight && message.author.id === fight.targetId && !message.author.bot) {
      if (Date.now() > fight.expiresAt) {
        fightConfig.delete(message.channelId);
        await message.channel.send(`⚔️ 時間到了，我懶得跟 <@${fight.targetId}> 對線了，放學！`);
        return;
      }

      fight.count++;
      increaseRayBloodPressure(5); // 對線模式每次回話血壓 +5
      await sleep(500 + Math.random() * 1000);
      const targetMention = `<@${fight.targetId}>`;
      const reply = getFightReply(fight.count, targetMention);
      await message.reply(reply);
      return;
    }

    // === 功能 0.5：高血壓隨機暴躁/擺爛模式 ===
    if (!message.author.bot) {
      const bp = getRayBloodPressure();
      if (bp >= 80 && Math.random() < 0.15) {
        await sleep(500 + Math.random() * 1000);
        const complaints = [
          '好累喔...別吵我啦...',
          '我的血壓爆表了，不想說話。',
          '（已讀不回）...呃，隨便啦。',
          '不要跟我講話，我正在考慮要不要離職。',
          '大腦休眠中，請勿打擾。',
          '好累，懶得理你們。',
          '...（裝作沒看到）',
        ];
        await message.reply(pickRandom(complaints));
        return;
      }
    }

    const content = message.content;
    const isTargetBot = message.author.id === TARGET_BOT_ID;
    const isTargetUser = message.author.id === TARGET_USER_ID;
    const guard = guardConfig.get(message.channelId);

    const topic = extractTopic(content);

    const pressureKeywords = [
      '學嗎', '不學', '為什麼不', '不喜歡', '會用到',
      '要不要學', '蠻重要', '你說啊', '所以...學嗎',
      '專案', '不行吧', '不愛寫程式',
    ];
    const pressureRegexes = [
      /學.*嗎/,
      /學一下/,
      /要不要學/,
      /你看過.*嗎/,
      /不.*學/,
      /不喜歡.*程式/,
    ];
    let isPressure = pressureKeywords.some((kw) => content.includes(kw)) ||
                     pressureRegexes.some((regex) => regex.test(content));
    if (topic) {
      isPressure = true;
    }

    // === 功能 1：自動反壓榨（升級版）===
    if (isTargetBot && isPressure) {
      const count = addPressureCount(TARGET_USER_ID);
      increaseRayBloodPressure(10); // 被壓榨每次血壓 +10

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

loadData();
initBot(true);
