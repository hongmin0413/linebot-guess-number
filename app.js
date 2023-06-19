//import
const linebot = require("@line/bot-sdk");
const guess = require("./util/guess");
const replyMsg = require("./util/replyMsg");
const googleSheet = require("./api/googleSheet");

//常數
require("dotenv").config();
const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};
const client = new linebot.Client(config);
const app = require("express")();

//監聽的路徑
app.post("/lineWebhook", linebot.middleware(config), function(req, res) {
    Promise.all(req.body.events.map(handleEvent))
    .then(function(result) {
        res.json(result);
    }).catch(function(err) {
        console.error(err);
        res.status(500).end();
    });
});

//監聽的port
app.listen(process.env.PORT || 3000, function() {
    // createRichMenu(richMenu: RichMenu): Promise<string>
    // deleteRichMenu(richMenuId: string): Promise<any>
    // getRichMenuAlias(richMenuAliasId: string): Promise<Types.GetRichMenuAliasResponse>>
    // createRichMenuAlias(richMenuId: string, richMenuAliasId: string): Promise<{}>
    // updateRichMenuAlias(richMenuAliasId: string, richMenuId: string): Promise<{}>
    // linkRichMenuToUser(userId: string, richMenuId: string): Promise<any>
    // setRichMenuImage(richMenuId: string, data: Buffer | Readable, contentType?: string): Promise<any>
    // setDefaultRichMenu(richMenuId: string): Promise<{}>

    console.log("【linebot已準備就緒】");
});

/**
 * 處理監聽事件(目前只有follow、message)
 * @param {object} event
 */
async function handleEvent(event) {
    let replyArray = [];
    //2023.06.19 非重新發送才處理訊息
    if(!event.deliveryContext.isRedelivery) {
        switch(event.type) {
            case "follow":
                /**
                 * userId 玩家ID
                 * displayName 玩家名字
                 * pictureUrl 玩家大頭照網址
                 * statusMessage 玩家自介內容
                 */
                let lineProfile = await client.getProfile(event.source.userId);
                handleFollowEvent(lineProfile, replyArray);
                break;
            case "message":
                //2023.06.17 playerInfo不再使用全域變數，改從googleSheet取得
                /**
                 * id 玩家ID
                 * playerName 玩家姓名
                 * gameWay 遊戲方式
                 * guessCount 玩家or電腦猜的次數
                 * computerQuestion 電腦出的數字(玩家猜才有)
                 * remainingNumber 電腦剩餘能猜的數字(電腦猜才有)
                 * computerAnswer 電腦猜的答案(電腦猜才有)
                 * playerBestGuess 玩家歷史最佳的紀錄(次數)
                 */
                let playerInfo = await getPlayersInfo(event.source.userId);
                //2023.06.17 playerInfo不再使用全域變數，若需要，最後要存至googleSheet
                if(handleMessageEvent(event, playerInfo, replyArray)) {
                    await googleSheet.insertOrUpdateDataBySheetTitle(playerInfo, "playersInfo");
                }
                break;
            default:
                break;
        }
    }

    //回覆
    if(replyArray.length > 0) {
        return client.replyMessage(event.replyToken, replyArray);
    }else {
        return Promise.resolve(null);
    }
}

/**
 * 取得玩家在googleSheet中的資訊
 * @param {string} playerId 玩家ID
 */
async function getPlayersInfo(playerId) {
    let playerInfo = await googleSheet.getDataBySheetTitle("playersInfo", playerId);
    //玩家還沒在googleSheet中，先初始化基本資訊
    if(!playerInfo) {
        playerInfo = {
            id: playerId,//玩家ID
            playerName: (await client.getProfile(playerId)).displayName,
            playerBestGuess: "-1"//玩家歷史最佳的紀錄(次數)
        };
    }
    return playerInfo;
}

/**
 * 處理有人加為好友、解除封鎖的事件
 * @param {object} lineProfile 玩家在line的基本資訊
 * @param {Array<object>} replyArray 電腦回覆的內容
 */
function handleFollowEvent(lineProfile, replyArray) {
    replyArray.push(replyMsg.getText(lineProfile.displayName+"你好，歡迎你的加入~"));
    replyArray.push(replyMsg.getGameOption());
}

/**
 * 處理有人傳訊息的事件
 * 2023.06.17 新增從googleSheet取得的playerInfo
 * @param {object} event
 * @param {object} playerInfo 玩家在遊戲中的資訊
 * @param {Array<object>} replyArray 電腦回覆的內容
 */
function handleMessageEvent(event, playerInfo, replyArray) {
    let isSaveToGoogleSheet = false;
    //區分訊息的類型
    switch(event.message.type) {
        //純文字
        case "text":
            let playerReply = event.message.text.trim();
            if(playerReply === "歷史最佳紀錄") {
                let reply = "";
                if(playerInfo.playerBestGuess === "-1") {
                    reply = "尚未有歷史最佳紀錄，趕快選擇\"自己猜\"來刷新紀錄吧~";
                }else {
                    reply = "你的歷史最佳紀錄為猜"+playerInfo.playerBestGuess+"次";
                }
                replyArray.push(replyMsg.getText(reply));
            }else if(playerReply === "開始遊戲" || playerReply === "遊戲開始" || playerReply === "重新開始") {
                replyArray.push(replyMsg.getGameOption());
                //2023.06.17 playerInfo不再使用全域變數，最後要重整
                resetPlayerInfo(playerInfo, false);
                isSaveToGoogleSheet = true;
            }else {
                //玩家正在選擇遊戲方式(不管有沒有在遊戲中)
                //2023.06.16 根據某人奇怪的操作，新增玩家開始遊戲後可以重新選擇遊戲方式
                if(!playerInfo.gameWay || playerReply.match(/^((玩家猜)|(電腦猜))$/)) {
                    handleChooseGameWay(playerInfo, playerReply, replyArray);
                //玩家正在遊戲中
                }else {
                    handleInGame(playerInfo, playerReply, replyArray);
                }
                isSaveToGoogleSheet = true;
            }
            break;
        //貼圖
        case "sticker":
            let text = "傳什麼貼圖啦$";
            let emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "007"}//生氣
            replyArray.push(replyMsg.getTextWithEmoji(text, emojiObj));
        //其他(目前無法傳)
        default:
            break;
    }
    return isSaveToGoogleSheet;
}

/**
 * 處理玩家正在選擇遊戲方式
 * 2023.06.17 新增從googleSheet取得的playerInfo
 * @param {object} playerInfo 玩家在遊戲中的資訊
 * @param {string} gameOption 玩家選擇的遊戲方式
 * @param {Array<object>} replyArray 電腦回覆的內容
 */
function handleChooseGameWay(playerInfo, gameOption, replyArray) {
    let text = null;
    let emojiObj = null;
    switch(gameOption) {
        //初始化"玩家猜"需要的玩家資訊
        case "玩家猜":
            //切換遊戲方式要把電腦猜才有的清空
            if(playerInfo.gameWay === "電腦猜") {
                playerInfo.remainingNumber = "";//電腦剩餘能猜的數字
                playerInfo.computerAnswer = "";//電腦猜的答案
            }
            playerInfo.gameWay = gameOption;//遊戲方式
            playerInfo.guessCount = "1";//玩家猜的次數
            playerInfo.computerQuestion = guess.getRandomStr(guess.getNumArray());//電腦出的數字
            
            replyArray.push(replyMsg.getText("選好數字了，開始猜吧~"));
            text = "如果想放棄，可以從下方選項選擇放棄，我不會笑你，但會笑在心裡$";
            emojiObj = {productId: "5ac21c46040ab15980c9b442", emojiId: "036"}//賊笑
            replyArray.push(replyMsg.getTextWithEmoji(text, emojiObj));
            break;
        //初始化"電腦猜"需要的玩家資訊
        case "電腦猜":
            //切換遊戲方式要把玩家猜才有的清空
            if(playerInfo.gameWay === "玩家猜") {
                playerInfo.computerQuestion = "";//電腦出的數字
            }
            let canChooseNumArray = guess.getNumArray();
            playerInfo.gameWay = gameOption;//遊戲方式
            playerInfo.guessCount = "1";//電腦猜的次數
            playerInfo.remainingNumber = canChooseNumArray.join(",");//電腦剩餘能猜的數字
            playerInfo.computerAnswer = guess.getRandomStr(canChooseNumArray);//電腦猜的答案
            
            //先隨機猜一個數字
            replyArray.push(replyMsg.getText("我先猜"+playerInfo.computerAnswer));
            break;
        default:
            //2023.06.16 增加回覆的內容
            text = guess.getRandomStr(guess.playerNoChooseContent);
            emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "179"}//哭哭
            replyArray.push(replyMsg.getTextWithEmoji(text, emojiObj));
            break;
    }
}

/**
 * 處理玩家正在遊戲中的回覆
 * @param {object} playerInfo 玩家在遊戲中的資訊
 * @param {string} playerReply 玩家的回覆
 * @param {Array<object>} replyArray 電腦回覆的內容
 */
function handleInGame(playerInfo, playerReply, replyArray) {
    switch(playerInfo.gameWay) {
        case "玩家猜":
            if(playerReply === "我放棄") {
                replyArray.push(replyMsg.getText("太遜了吧，答案是"+playerInfo.computerQuestion+"啦~"));
                replyArray.push(replyMsg.getGameOption());
                //2023.06.17 playerInfo不再使用全域變數，最後要重整
                resetPlayerInfo(playerInfo, false);
            //玩家的回覆有符合格式(4位數數字)
            }else if(playerReply.match(/^\d{4}$/)) {
                //玩家猜對
                if(playerReply === playerInfo.computerQuestion) {
                    replyArray.push(replyMsg.getText("恭喜你猜對了，正確答案就是"+playerInfo.computerQuestion));
                    replyArray.push(replyMsg.getText("很厲害嘛，總共猜了"+playerInfo.guessCount+"次~"));
                    replyArray.push(replyMsg.getGameOption());
                    //2023.06.17 playerInfo不再使用全域變數，最後要重整
                    resetPlayerInfo(playerInfo, true);
                //玩家沒猜對
                }else {
                    guess.analyzePlayerAnswer(playerInfo, playerReply);
                    //有錯誤訊息時，回傳此訊息
                    if(playerInfo.computerErrMsg) {
                        replyArray.push(replyMsg.getText(playerInfo.computerErrMsg));
                    //否則回傳結果，並增加玩家猜的次數
                    }else {
                        replyArray.push(replyMsg.getText(playerInfo.computerReplyResult));
                        playerInfo.guessCount = (parseInt(playerInfo.guessCount)+1)+"";
                    }
                }
            //其他回覆
            }else {
                let text = "不想繼續猜嗎$，我好不容易想到數字餒~";
                let emojiObj = {productId: "5ac21c46040ab15980c9b442", emojiId: "052"}//難過
                replyArray.push(replyMsg.getTextWithEmoji(text, emojiObj));
            }
            break;
        case "電腦猜":
            //電腦猜對
            if(playerReply.match(/^((4a)|(4a0b)|(0b4a)|(答對了)|(答對))$/gi)) {
                if(playerInfo.guessCount <= 4) {
                    replyArray.push(replyMsg.getText("我只花了"+playerInfo.guessCount+"次就猜對了，厲害吧!"));
                }else if(playerInfo.guessCount <= 8) {
                    replyArray.push(replyMsg.getText("太棒了~我花了"+playerInfo.guessCount+"次猜對"));
                }else {
                    let text = "什麼$，我居然花了"+playerInfo.guessCount+"次才猜對，該閉關修煉了!";
                    let emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "006"}//驚訝
                    replyArray.push(replyMsg.getTextWithEmoji(text, emojiObj));
                }
                replyArray.push(replyMsg.getGameOption());
                //2023.06.17 playerInfo不再使用全域變數，最後要重整
                resetPlayerInfo(playerInfo, false);
            //玩家的回覆有符合格式(1a2b、1a、2b、都沒有，皆不分大小寫)
            }else if(playerReply.match(/^((\d{1}a\d{1}b)|(\d{1}b\d{1}a)|(\d{1}a)|(\d{1}b)|(都沒有))$/gi)) {
                guess.guessNum(playerInfo, playerReply);
                //有錯誤訊息時，回傳此訊息
                if(playerInfo.computerErrMsg) {
                    replyArray.push(replyMsg.getText(playerInfo.computerErrMsg));
                //電腦沒有可以猜的數字時
                }else if(!playerInfo.computerAnswer) {
                    replyArray.push(replyMsg.getText("你是不是之前有講錯啊，怎麼沒答案!"));
                    replyArray.push(replyMsg.getText("想繼續玩就從下方選項選擇重新開始吧~"));
                    //2023.06.17 playerInfo不再使用全域變數，最後要重整
                    resetPlayerInfo(playerInfo, false);
                //否則回傳答案，並增加電腦猜的次數
                }else {
                    replyArray.push(replyMsg.getText(playerInfo.computerAnswer));
                    playerInfo.guessCount = (parseInt(playerInfo.guessCount)+1)+"";
                }
            //其他回覆
            }else {
                replyArray.push(replyMsg.getText("跟我說結果嘛，我想繼續猜~"));
            }
            break;
        default:
            break;
    }
}

/**
 * 切換遊戲方式、遊戲結束時，重整playerInfo
 * @param {object} playerInfo 玩家在遊戲中的資訊
 * @param {boolean} isReviseBestGuess 是否修改玩家歷史最佳的紀錄
 */
function resetPlayerInfo(playerInfo, isReviseBestGuess) {
    //基本的重整
    playerInfo.gameWay = "";
    playerInfo.computerQuestion = "";
    playerInfo.remainingNumber = "";
    playerInfo.computerAnswer = "";

    //修改玩家歷史最佳的紀錄
    if(isReviseBestGuess) {
        let guessCount = parseInt(playerInfo.guessCount);
        let playerBestGuess = parseInt(playerInfo.playerBestGuess);
        if(playerBestGuess == -1 || guessCount < playerBestGuess) {
            playerInfo.playerBestGuess = playerInfo.guessCount;
        }
    }
    playerInfo.guessCount = "";
}