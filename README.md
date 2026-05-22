# Rayisme Bot — 反壓榨護航機器人

> 「學嗎？」「懶得學」「考慮一下」「你先學啊」

你身邊有沒有那種人，做了一個 Bot 專門壓榨你，但他自己什麼都懶得做、什麼都考慮一下？

這個 Bot 就是用他的人設反擊他。

## 功能

### Slash 指令

| 指令 | 說明 |
|---|---|
| `/模仿ray 主題:Vue` | 產生一段「懶得 + 考慮一下」風格語錄 |
| `/懶得 事情:debug` | 單發一句懶回應 |
| `/考慮一下` | 連續轟炸「考慮一下」的各種變體 |
| `/護航模式 保護對象:@你 反轉對象:@Ray` | 自動護航 + UNO 反轉 + 壓榨回力鏢 |
| `/停止護航` | 關掉護航模式 |
| `/戰績 對象:@Ray` | 查看某人壓榨了幾次，附嘲諷 |
| `/重置戰績 對象:@Ray` | 清除壓榨記錄 |
| `/考慮計時器 對象:@Ray` | 開始計時「考慮一下」，定期提醒 |
| `/停止計時 對象:@Ray` | 停止考慮計時器 |

### 自動系統（不需下指令）

- **自動反壓榨** — 偵測到對方 Bot 發壓榨訊息，立刻用「懶得學」「考慮一下」回嘴
- **壓榨回力鏢** — 從壓榨訊息中抽出主題，反彈回對方本人：`「Vue 要不要學？」→「欸 @Ray 你 Vue 要不要學一下？」`
- **壓榨計數器** — 每次壓榨自動 +1，每 5 次加碼嘲諷
- **發言偵測** — 對方本人說「考慮」或「懶得」時自動吐槽

## 安裝

```bash
git clone https://github.com/wulukewu/rayisme.git
cd rayisme
npm install
```

建立 `.env`：

```bash
cp .env.example .env
```

填入環境變數：

| 變數 | 必填 | 說明 |
|---|---|---|
| `CLIENT_ID` | ✅ | Bot 的 Application ID |
| `DISCORD_TOKEN` | ✅ | Bot 的 Token |
| `TARGET_BOT_ID` | ❌ | 對方 Bot 的 ID（啟用自動反壓榨、回力鏢） |
| `TARGET_USER_ID` | ❌ | 對方本人的 ID（啟用發言偵測、回力鏢 @） |

> `TARGET_BOT_ID` 和 `TARGET_USER_ID` 是 optional 的。不填的話手動指令（`/模仿ray`、`/護航模式` 等）一樣能用，只是自動系統不會啟動。

> [!IMPORTANT]
> **關於「自動監聽系統」（自動反壓榨、發言偵測等）：**
> 由於 Discord 的隱私規範，自動監聽一般訊息的功能需要啟用 **Message Content Intent**（訊息內容意圖）特權。
> 
> 💡 **自動降級與相容模式：**
> 本專案已實作**自動偵測與降級機制**。啟動時 Bot 會自動嘗試使用該特權。如果您的 Bot 未在後台開啟此權限，系統會**自動降級至「相容模式」運作，絕不崩潰！** 在相容模式下，手動的 Slash 指令仍可完全正常運作，唯獨自動監聽系統不會生效。
> 
> **如何開啟完整功能：**
> 1. 前往 [Discord Developer Portal](https://discord.com/developers/applications) ➔ 選擇您的應用程式 ➔ 點擊左側 **Bot**。
> 2. 往下拉找到 **Privileged Gateway Intents** 區塊，將 **MESSAGE CONTENT INTENT** 開啟（ON）並儲存。
> 3. 重新啟動 Bot，程式便會自動偵測並啟用完整自動化功能，**無需修改任何程式碼**！



註冊指令 & 啟動：

```bash
node deploy-commands.js
node bot.js
```

## 語錄範例

```
/模仿ray 主題:Docker

Docker喔...
懶得學Docker
嗯...考慮一下
太麻煩了 懶得弄
再說啦
```

```
[pressure-bot] Vue 要不要學一下？
[rayisme-bot] 考慮一下
[rayisme-bot] 欸 @Ray 你 Vue 要不要學一下？
```

## 免責聲明

本 Bot 產生的所有語錄均基於真實觀察。如有雷同，代表你朋友真的是這樣。

## 致謝

感謝 [@rayhuang2006](https://github.com/rayhuang2006) 的 [pressure-bot](https://github.com/rayhuang2006/pressure-bot) 提供靈感與開戰理由。沒有你的壓榨，就沒有這個反擊。
