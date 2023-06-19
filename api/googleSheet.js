//import
const {GoogleSpreadsheet, GoogleSpreadsheetRow} = require("google-spreadsheet");

//常數
require("dotenv").config();
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

/**
 * 在某資料表取得資料
 * @param {string} sheetTitle 資料表名稱
 * @param {string?} id 資料表ID(若有回傳其中一列或null，若沒有則回傳全部列)
 */
async function getDataBySheetTitle(sheetTitle, id) {
    //先讀取資料表
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n')
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetTitle];

    //處理資料
    let data = id ? null : [];
    if(typeof sheet === "undefined" || sheet == null) {
        console.error("查無資料表");
    }else {
        const rowArray = await sheet.getRows();
        if(rowArray && rowArray.length > 0) {
            for(row of rowArray) {
                //有id就找那一列
                if(id && id === row.id) {
                    data = row;
                }else if(!id) {
                    data.push(row);
                }
            }
        }
    }
    return data;
}

/**
 * 在某資料表新增or更新資料
 * @param {object} data 資料
 * @param {string?} sheetTitle 資料表名稱(確定是更新的話可以不用)
 */
async function insertOrUpdateDataBySheetTitle(data, sheetTitle) {
    //檢誤是否有id
    if(!data.id) {
        console.error("欄位中須有id");
        return;
    }

    //已經有資料(update)
    if(data instanceof GoogleSpreadsheetRow) {
        await data.save();
    //目前無資料(insert)
    }else {
        //先讀取資料表
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n')
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle[sheetTitle];
        await sheet.addRow(data);
    }
}

//給app.js使用的
module.exports = {
    getDataBySheetTitle: getDataBySheetTitle,
    insertOrUpdateDataBySheetTitle: insertOrUpdateDataBySheetTitle
}