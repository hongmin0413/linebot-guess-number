//import
const replyMsg = require("./replyMsg");

/**
 * 全部能猜的數字陣列
 */
const numArray = [];

/**
 * 取得能猜的數字陣列
 */
function getNumArray() {
    let minNum = 0;
    let maxNum = 9;
    //若是空的，重新產生
    if(numArray.length == 0) {
        for(let n1 = minNum; n1 <= maxNum; n1++) {
            for(let n2 = minNum; n2 <= maxNum; n2++) {
                if(n1 == n2) {//數字重複就跳過
                    continue;
                }
                for(let n3 = minNum; n3 <= maxNum; n3++) {
                    if(n1 == n3 || n2 == n3) {//數字重複就跳過
                        continue;
                    }
                    for(let n4 = minNum; n4 <= maxNum; n4++) {
                        if(n1 != n4 && n2 != n4 && n3 != n4) {//數字重複就不加進去
                            numArray.push(""+n1+n2+n3+n4);
                        }
                    }
                }
            }
        }
    }
    return Object.assign([], numArray);
}

/**
 * 分析玩家的答案
 * @param {object} playerInfo 玩家資訊
 * @param {string} playerAnswer 玩家的答案
 */
async function analyzePlayerAnswer(playerInfo, playerAnswer) {
    //先檢查有沒有重複數字
    let isNumRepeat = false;
    let playerAnswerArray = [];
    for(let i = 0; i < playerAnswer.length; i++) {
        let numberSingle = playerAnswer.slice(i, i+1);
        //有重複
        if(playerAnswerArray.includes(numberSingle)) {
            isNumRepeat = true;
            break;
        //沒重複
        }else {
            playerAnswerArray.push(numberSingle);
        }
    }

    if(isNumRepeat) {
        playerInfo.computerErrMsg = "數字怎麼可以重複，這樣我怎麼給你結果~";
    }else {
        let resultAB = getAB(playerInfo.computerQuestion, playerAnswer);
        let resultStr = playerAnswer+" => "+resultAB.a+"A"+resultAB.b+"B";
        //根據a、b數量增加回覆內容(1A3B、2A2B、3A1B、3A)
        if(resultAB.a+resultAB.b == 4 || resultAB.a == 3) {
            resultStr += "，"+(await replyMsg.getReplyContent(replyMsg.replyTypeMap.playerGuessAdd));
        }
        playerInfo.computerReplyResult = resultStr;
    }
}

/**
 * 根據玩家的回覆猜數字
 * @param {object} playerInfo 玩家資訊
 * @param {string} playerReply 玩家的回覆
 */
async function guessNum(playerInfo, playerReply) {
    //分析玩家的回覆得出a、b並做簡單檢誤
    let a = 0;
    let b = 0;
    if(!playerReply.match(/^((0a0b)|(0a)|(0b)|(都沒有))$/gi)) {
        //型式為1a、2b
        if(playerReply.length == 2) {
            //型式為1a
            if(playerReply.match(/^\d{1}a$/gi)) {
                a = parseInt(playerReply.slice(0, 1));
            //型式為2b
            }else {
                b = parseInt(playerReply.slice(0, 1));
            }
        //型式為1a2b、2b1a
        }else {
            //型式為1a2b
            if(playerReply.match(/^\d{1}a\d{1}b$/gi)) {
                a = parseInt(playerReply.slice(0, 1));
                b = parseInt(playerReply.slice(2, 3));
            //型式為2b1a
            }else {
                a = parseInt(playerReply.slice(2, 3));
                b = parseInt(playerReply.slice(0, 1));
            }
        }
    }
    if(a+b > 4 || (a == 3 && b == 1)) {
        playerInfo.computerErrMsg = "你的A、B數量好像怪怪的喔~";
        return;
    }

    //開始過濾不可能的數字
    //因為前面有增加回覆內容，所以只取後4位(純數字)
    //2023.06.17 因為googleSheet只能存字串，故先split再join
    let computerAnswer = playerInfo.computerAnswer.slice(-4);
    let remainingNumArray = playerInfo.remainingNumber.split(",").filter(function(value) {
        //2023.06.21 只要相同一定是錯的，所以直接排除
        if(computerAnswer === value) {
            return false;
        }
        let resultAB = getAB(computerAnswer, value);
        return a == resultAB.a && b == resultAB.b;
    });
    playerInfo.remainingNumber = remainingNumArray.join(",");

    //從剩餘的數字陣列中隨機取一個數字
    if(remainingNumArray.length > 0) {
        //根據a、b數量增加回覆內容(1A3B、2A2B、3A1B、3A)
        let answerStr = "那我猜";
        if(a+b == 4 || a == 3) {
            answerStr = await replyMsg.getReplyContent(replyMsg.replyTypeMap.computerGuessAdd);
        }
        answerStr += replyMsg.getRandomStr(remainingNumArray);
        playerInfo.computerAnswer = answerStr;
    }else {
        playerInfo.computerAnswer = "";
    }
}

/**
 * 比較兩個數字，取得?A?B
 * @param {string} num1 數字1
 * @param {string} num2 數字2
 */
function getAB(num1, num2) {
    let resultAB = {a: 0, b: 0};

    //開始比較
    let num1Array = num1.split("");
    let num2Array = num2.split("");
    for(let i = 0; i < num1Array.length; i++) {
        for(let j = 0; j < num2Array.length; j++) {
            //數字相同時才增加a、b的數量
            if(num1Array[i] === num2Array[j]) {
                //位置相同時增加a的數量
                if(i == j) {
                    resultAB.a++;
                //否則增加b的數量
                }else {
                    resultAB.b++;
                }
                //遇到相同的就離開迴圈，因為數字不可能重複
                break;
            }
        }
    }

    return resultAB;
}

//給app.js使用的
module.exports = {
    getNumArray: getNumArray,
    analyzePlayerAnswer: analyzePlayerAnswer,
    guessNum: guessNum
}