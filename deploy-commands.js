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
