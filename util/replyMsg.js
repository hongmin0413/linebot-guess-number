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
    getText: getText,
    getTextWithEmoji: getTextWithEmoji,
    getGameOption: getGameOption
}