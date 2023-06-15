//import
const linebot = require("@line/bot-sdk");
const guess = require("./guess");

//常數
require("dotenv").config();
const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};
const client = new linebot.Client(config);
const app = require("express")();
/**
 * 玩家猜:
 * gameWay 遊戲方式
 * guessCount 玩家猜的次數
 * computerErrMsg 電腦提示的錯誤訊息(數字重複)
 * computerQuestion 電腦出的數字
 * computerReplyResult 電腦回覆玩家猜的結果
 * 電腦猜：
 * gameWay 遊戲方式
 * guessCount 玩家猜的次數
 * computerErrMsg 電腦提示的錯誤訊息(A、B數量不正確)
 * remainingNumArray 電腦可以猜的數字範圍
 * computerAnswer 電腦猜的答案
 */
const allPlayerInfo = {};

app.post("/lineWebhook", linebot.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
        console.error(err);
        res.status(500).end();
    });
});

async function handleEvent(event) {
    /**
     * userId 玩家ID
     * displayName 玩家名字
     * pictureUrl 玩家大頭照網址
     * statusMessage 玩家自介內容
     */
    let replyArray = [];
    switch(event.type) {
        case "follow":
            let profile = await client.getProfile(event.source.userId);
            handleFollowEvent(profile, replyArray);
            break;
        case "message":
            handleMessageEvent(event, replyArray);
            break;
        default:
            break;
    }
    //回覆
    if(replyArray.length > 0) {
        return client.replyMessage(event.replyToken, replyArray);
    }else {
        return Promise.resolve(null);
    }
}

/**
 * 處理有人加為好友、解除封鎖的事件
 * @param {object} profile 玩家資料
 * @param {Array<object>} replyArray 回覆的內容
 */
function handleFollowEvent(profile, replyArray) {
    replyArray.push(getText(profile.displayName+"你好，歡迎你的加入~"));
    replyArray.push(getGameOption());
}

/**
 * 處理有人傳訊息的事件
 * @param {*} event
 * @param {Array<object>} replyArray 回覆的內容
 */
function handleMessageEvent(event, replyArray) {
    //只接受純文字
    if(event.message.type === "text") {
        let playerReply = event.message.text.trim();
        let playerId = event.source.userId;
        if(playerReply === "開始遊戲" || playerReply === "遊戲開始" || playerReply === "重新開始") {
            //刪除玩家資訊(可能有可能沒有，但還是先刪除，避免之後誤判)
            delete allPlayerInfo[playerId];
            replyArray.push(getGameOption());
        }else {
            //玩家還沒開始，正在選擇遊戲方式
            if(!allPlayerInfo[playerId]) {
                replyArray = handleNotInGame(playerId, playerReply, replyArray);
            //玩家正在遊戲中
            }else {
                replyArray = handleInGame(playerId, playerReply, replyArray);
            }
        }
    }else {
        let text = "傳什麼貼圖啦$";
        let emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "007"}//生氣
        replyArray.push(getTextWithEmoji(text, emojiObj));
    }
}

/**
 * 處理玩家還沒開始，正在選擇遊戲方式
 * @param {string} playerId 玩家ID
 * @param {string} gameOption 玩家選擇的遊戲方式
 * @param {Array<object>} replyArray 回覆的內容
 */
function handleNotInGame(playerId, gameOption, replyArray) {
    let text = null;
    let emojiObj = null;
    switch(gameOption) {
        //初始化"玩家猜"需要的玩家資訊
        case "玩家猜":
            allPlayerInfo[playerId] = {
                gameWay: gameOption,//遊戲方式
                guessCount: 1,//玩家猜的次數
                computerErrMsg: "",//電腦提示的錯誤訊息(數字重複)
                computerQuestion: guess.getRandomStr(guess.getNumArray()),//電腦出的數字
                computerReplyResult: ""//電腦回覆玩家猜的結果
            };
            replyArray.push(getText("選好數字了，開始猜吧~"));
            text = "若想放棄，請回我\"我放棄\"，我不會笑你，但會笑在心裡$";
            emojiObj = {productId: "5ac21c46040ab15980c9b442", emojiId: "036"}//賊笑
            replyArray.push(getTextWithEmoji(text, emojiObj));
            break;
        //初始化"電腦猜"需要的玩家資訊
        case "電腦猜":
            let canChooseNumArray = guess.getNumArray();
            allPlayerInfo[playerId] = {
                gameWay: gameOption,//遊戲方式
                guessCount: 1,//電腦猜的次數
                computerErrMsg: "",//電腦提示的錯誤訊息(A、B數量不正確)
                remainingNumArray: canChooseNumArray,//電腦可以猜的數字範圍
                computerAnswer: guess.getRandomStr(canChooseNumArray)//電腦猜的答案
            };
            //先隨機猜一個數字
            replyArray.push(getText("我先猜"+allPlayerInfo[playerId].computerAnswer));
            break;
        default:
            text = "不想陪我玩嗎$，我很孤單餒~";
            emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "005"}//哭哭
            replyArray.push(getTextWithEmoji(text, emojiObj));
            break;
    }
}

/**
 * 處理玩家正在遊戲中的回覆
 * @param {string} playerId 玩家ID
 * @param {string} playerReply 玩家的回覆
 * @param {Array<object>} replyArray 回覆的內容
 */
function handleInGame(playerId, playerReply, replyArray) {
    let playerInfo = allPlayerInfo[playerId];
    switch(playerInfo.gameWay) {
        case "玩家猜":
            if(playerReply === "我放棄") {
                replyArray.push(getText("太遜了吧，答案是"+playerInfo.computerQuestion+"啦~"));
                //刪除玩家資訊
                delete allPlayerInfo[playerId];
                replyArray.push(getGameOption());
            //玩家的回覆有符合格式(4位數數字)
            }else if(playerReply.match(/^\d{4}$/)) {
                //玩家猜對
                if(playerReply === playerInfo.computerQuestion) {
                    replyArray.push(getText("恭喜你猜對了，正確答案就是"+playerInfo.computerQuestion));
                    replyArray.push(getText("很厲害嘛，總共猜了"+playerInfo.guessCount+"次~"));
                    //刪除玩家資訊
                    delete allPlayerInfo[playerId];
                    replyArray.push(getGameOption());
                //玩家沒猜對
                }else {
                    guess.analyzePlayerAnswer(playerInfo, playerReply);
                    //有錯誤訊息時，回傳此訊息並清空
                    if(playerInfo.computerErrMsg) {
                        replyArray.push(getText(playerInfo.computerErrMsg));
                        playerInfo.computerErrMsg = "";
                    //否則回傳結果，並增加玩家猜的次數
                    }else {
                        replyArray.push(getText(playerInfo.computerReplyResult));
                        playerInfo.guessCount++;
                    }
                }
            //其他回覆
            }else {
                let text = "不想繼續猜嗎$，我好不容易想到數字餒~";
                let emojiObj = {productId: "5ac21c46040ab15980c9b442", emojiId: "052"}//難過
                replyArray.push(getTextWithEmoji(text, emojiObj));
            }
            break;
        case "電腦猜":
            //電腦猜對
            if(playerReply.match(/^(4a)|(答對了)$/gi)) {
                if(playerInfo.guessCount <= 4) {
                    replyArray.push(getText("我只花了"+playerInfo.guessCount+"次就猜對了，厲害吧!"));
                }else if(playerInfo.guessCount <= 8) {
                    replyArray.push(getText("太棒了~我花了"+playerInfo.guessCount+"次猜對"));
                }else {
                    let text = "什麼$，我居然花了"+playerInfo.guessCount+"次才猜對，該閉關修煉了!";
                    let emojiObj = {productId: "5ac1bfd5040ab15980c9b435", emojiId: "006"}//驚訝
                    replyArray.push(getTextWithEmoji(text, emojiObj));
                }
                //刪除玩家資訊
                delete allPlayerInfo[playerId];
                replyArray.push(getGameOption());
            //玩家的回覆有符合格式(1a2b、1a、2b、都沒有，皆不分大小寫)
            }else if(playerReply.match(/^(\d{1}a\d{1}b)|(\d{1}b\d{1}a)|(\d{1}a)|(\d{1}b)|(都沒有)$/gi)) {
                guess.guessNum(playerInfo, playerReply);
                //有錯誤訊息時，回傳此訊息並清空
                if(playerInfo.computerErrMsg) {
                    replyArray.push(getText(playerInfo.computerErrMsg));
                    playerInfo.computerErrMsg = "";
                //電腦沒有可以猜的數字時，刪除玩家資訊
                }else if(!playerInfo.computerAnswer) {
                    delete allPlayerInfo[playerId];
                    replyArray.push(getText("你是不是之前有講錯啊，怎麼沒答案!"));
                    replyArray.push(getText("想繼續玩就跟我說\"重新開始\"吧~"));
                //否則回傳答案，並增加電腦猜的次數
                }else {
                    replyArray.push(getText(playerInfo.computerAnswer));
                    playerInfo.guessCount++;
                }
            //其他回覆
            }else {
                replyArray.push(getText("跟我說結果嘛，我想繼續猜~"));
            }
            break;
        default:
            break;
    }
}

/**
 * 取得純文字內容物件
 * @param {string} text 文字
 */
function getText(text) {
    return {
        type: "text",
        text: text
    }
}

/**
 * 取得含emoji的文字內容物件
 * @param {string} text 文字內容(在emoji位置加"$")
 * @param {Array<object>} emojiObjArray emoji物件陣列(須有productId、emojiId)
 */
function getTextWithEmoji(text, ...emojiObjArray) {
    let emojiArray = [];
    let searchBeginIndex = 0;
    for(let i = 0; i < emojiObjArray.length; i++) {
        let emojiIndex = text.indexOf("$", searchBeginIndex);
        emojiArray.push({
            index: emojiIndex,
            productId: emojiObjArray[i].productId,
            emojiId: emojiObjArray[i].emojiId
        });
        searchBeginIndex = emojiIndex+1;
    }
    return {
        type: "text",
        text: text,
        emojis: emojiArray
    }
}

/**
 * 取得選擇遊戲方式的template
 */
function getGameOption() {
    return {
        type: "template",
        altText: "遊戲方式選擇",//收到通知出現的字樣
        template: {
            type: "buttons",
            thumbnailImageUrl: "https://www.core-corner.com/Web/Images/Page/F4Ey0AZZ_20170816.jpg",
            title: "請選擇遊戲方式：",
            text: "遊戲說明請看我的主頁~",
            actions: [
                {
                    type: "message",
                    label: "玩家猜",
                    text: "玩家猜"
                },
                {
                    type: "message",
                    label: "電腦猜(請先想好數字再開始)",
                    text: "電腦猜"
                }
            ]
        }
    }
}

//監聽的port
app.listen(process.env.PORT || 3000, function() {
    console.log("【linebot已準備就緒】");
});