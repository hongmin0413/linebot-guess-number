//import
const googleSheet = require("../api/googleSheet");

/**
 * 回覆類型
 */
const replyTypeMap = {
    playerNoChoose: 1,
    playerGuessAdd: 2,
    playerGuessUnformat: 3,
    computerGuessAdd: 4,
    computerGuessUnformat: 5
};

/**
 * 玩家沒有選擇遊戲方式的回覆內容(有哭哭的emoji)
 */
let playerNoChooseContent = [];
/**
 * 玩家猜時，根據a、b數量增加的回覆內容(放在結果後面)
 */
let playerGuessAddContent = [];
/**
 * 玩家猜時，玩家回覆非格式的回覆內容(有難過的emoji)
 */
let playerGuessUnformatContent = [];
/**
 * 電腦猜時，根據a、b數量增加的回覆內容(放在答案前面)
 */
let computerGuessAddContent = [];
/**
 * 電腦猜時，玩家回覆非格式的回覆內容
 */
let computerGuessUnformatContent = [];

/**
 * 取得電腦回覆的內容
 * @param {number?} replyType 回覆類型
 * @param {number?} rows 要讀取的列數(扣除表頭)
 */
async function getReplyContent(replyType, rows) {
    rows = typeof rows === "number" ? rows : 50;
    let columns = 5;
    //若是空的或要重新讀取(回覆類型為null)，重新讀取googleSheet
    if(playerNoChooseContent.length == 0 || playerGuessAddContent.length == 0 ||
        playerGuessUnformatContent.length == 0 || computerGuessAddContent.length == 0 ||
        computerGuessUnformatContent.length == 0 || replyType == null) {
        let cellArray = await googleSheet.getCellArrayBySheetTitle("replyContent", rows, columns);
        //放進陣列中
        playerNoChooseContent = cellArray[0];
        playerGuessAddContent = cellArray[1];
        playerGuessUnformatContent  = cellArray[2];
        computerGuessAddContent = cellArray[3];
        computerGuessUnformatContent = cellArray[4];
    }
    switch(replyType) {
        case replyTypeMap.playerNoChoose:
            return getRandomStr(playerNoChooseContent);
        case replyTypeMap.playerGuessAdd:
            return getRandomStr(playerGuessAddContent);
        case replyTypeMap.playerGuessUnformat:
            return getRandomStr(playerGuessUnformatContent);
        case replyTypeMap.computerGuessAdd:
            return getRandomStr(computerGuessAddContent);
        case replyTypeMap.computerGuessUnformat:
            return getRandomStr(computerGuessUnformatContent);
        case null:
            let reReadResult = "playerNoChooseContent: "+playerNoChooseContent.join(",");
            reReadResult += "\n\nplayerGuessAddContent: "+playerGuessAddContent.join(",");
            reReadResult += "\n\nplayerGuessUnformatContent: "+playerGuessUnformatContent.join(",");
            reReadResult += "\n\ncomputerGuessAddContent: "+computerGuessAddContent.join(",");
            reReadResult += "\n\ncomputerGuessUnformatContent: "+computerGuessUnformatContent.join(",");
            return reReadResult;
        default:
            return null;
    }
}

/**
 * 隨機從陣列中取得一值(數字、回覆內容)
 * @param {Array<string>} strArray 可選擇的範圍
 */
function getRandomStr(strArray) {
    let str = "";
    if(strArray.length > 0) {
        str = strArray[Math.floor(Math.random() * strArray.length)];
    }
    return str;
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
 * 2023.06.17 buttons -> flex message
 */
function getGameOption() {
    return {
        type: "flex", 
        altText: "選擇遊戲方式",//在通知顯示的文字
        contents: {
            type: "bubble",
            size: "kilo",
            hero: {
                type: "image",
                url: "https://www.core-corner.com/Web/Images/Page/F4Ey0AZZ_20170816.jpg",
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover"
            },
            body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                    {
                        type: "text",
                        text: "請選擇遊戲方式：",
                        weight: "bold",
                        margin: "xs",
                        size: "lg"
                    },
                    {
                        type: "text",
                        text: "遊戲說明請看我的主頁~",
                        margin: "xs",
                        size: "sm"
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                position: "relative",
                width: "100%",
                height: "70px",
                contents: [
                    {
                        type: "text",
                        text: "自己猜",
                        position: "absolute",
                        offsetTop: "40%",
                        offsetStart: "16%",
                        action: {
                            type: "message",
                            text: "玩家猜"
                        },
                        color: "#42659a"
                    },
                    {
                        type: "text",
                        text: "電腦猜",
                        position: "absolute",
                        offsetTop: "15%",
                        offsetStart: "66%",
                        action: {
                            type: "message",
                            text: "電腦猜"
                        },
                        color: "#42659a"
                    },
                    {
                        type: "text",
                        text: "(請先想好數字)",
                        position: "absolute",
                        offsetBottom: "40%",
                        offsetStart: "53%",
                        action: {
                            type: "message",
                            text: "電腦猜"
                        },
                        color: "#42659a"
                    }
                ]
            }
        }
    }
}

//給app.js、guess.js使用的
module.exports = {
    replyTypeMap: replyTypeMap,
    getReplyContent: getReplyContent,
    getRandomStr: getRandomStr,
    getText: getText,
    getTextWithEmoji: getTextWithEmoji,
    getGameOption: getGameOption
}