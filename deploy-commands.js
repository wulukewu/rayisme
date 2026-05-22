const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env. DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('模仿ray')
    .setDescription('產生一段 Ray 風格的語錄（懶得 + 考慮一下）')
    .addStringOption((option) =>
      option.setName('主題').setDescription('Ray 懶得做的事情，例如：寫作業、部署、開會').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('對象').setDescription('要展示給誰看（選填）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('護航模式')
    .setDescription('自動護航被壓榨的人 + UNO 反轉壓力 + 回力鏢')
    .addUserOption((option) =>
      option.setName('保護對象').setDescription('要保護的人').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('反轉對象').setDescription('要把壓力反轉給誰').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('時間').setDescription('護航幾分鐘（預設 5 分鐘）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('停止護航')
    .setDescription('停止自動護航'),

  new SlashCommandBuilder()
    .setName('考慮一下')
    .setDescription('用 Ray 經典的「考慮一下」連續轟炸')
    .addUserOption((option) =>
      option.setName('對象').setDescription('要對誰說考慮一下（選填）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('懶得')
    .setDescription('用 Ray 的口吻表達懶得做某件事')
    .addStringOption((option) =>
      option.setName('事情').setDescription('懶得做什麼，例如：寫報告、debug').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('對象').setDescription('要回覆誰（選填）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('戰績')
    .setDescription('查看某人的壓榨次數與等級')
    .addUserOption((option) =>
      option.setName('對象').setDescription('要查誰的壓榨記錄').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('重置戰績')
    .setDescription('清除某人的壓榨記錄（給他重新做人的機會）')
    .addUserOption((option) =>
      option.setName('對象').setDescription('要清除誰的記錄').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('考慮計時器')
    .setDescription('開始計時某人的「考慮一下」，越久越酸')
    .addUserOption((option) =>
      option.setName('對象').setDescription('誰說了考慮一下').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('間隔').setDescription('每幾分鐘提醒一次（預設 5 分鐘）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('停止計時')
    .setDescription('停止考慮計時器')
    .addUserOption((option) =>
      option.setName('對象').setDescription('要停止計時的人').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('幫助')
    .setDescription('查看所有指令的使用說明'),

  new SlashCommandBuilder()
    .setName('對線模式')
    .setDescription('鎖定目標對象進行無條件反擊回嘴（Ray 人設）')
    .addUserOption((option) =>
      option.setName('對象').setDescription('鎖定的對線目標').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('時間').setDescription('對線時間（分鐘，預設 5 分鐘）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('停止對線')
    .setDescription('放過對方，手動解除對線模式'),

  new SlashCommandBuilder()
    .setName('敷衍翻譯')
    .setDescription('將任何正經內容翻譯成 Ray 的終極擺爛敷衍版本')
    .addStringOption((option) =>
      option.setName('內容').setDescription('要翻譯的文字').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('血壓')
    .setDescription('查看 Ray 當前的血壓值與擺爛指數 📈'),

  new SlashCommandBuilder()
    .setName('抓戰犯')
    .setDescription('為發生的問題尋找一個完美的戰犯（責任推卸系統） 🛡️')
    .addStringOption((option) =>
      option.setName('問題').setDescription('發生了什麼事').setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('對象').setDescription('指定戰犯（不指定則由系統隨機指派）').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('下班倒數')
    .setDescription('計算距離靈魂下班（18:00）還有多久 ⏱️'),

  new SlashCommandBuilder()
    .setName('請假理由')
    .setDescription('產生一個地表最強、極具創意且難以拒絕的請假藉口 🥱'),
].map((cmd) => cmd.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log('正在註冊 Slash Commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Slash Commands 註冊成功！');
  } catch (error) {
    console.error('註冊失敗：', error);
  }
})();
