//import
const {GoogleSpreadsheet, GoogleSpreadsheetRow} = require("google-spreadsheet");

//常數
require("dotenv").config();
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

/**
 * 在某資料表取得列資料
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
        console.error("查無資料表，sheetTitle: "+sheetTitle);
    }else {
        const rowArray = await sheet.getRows();
        if(rowArray && rowArray.length > 0) {
            for(row of rowArray) {
                //有id就找那一列
                if(id && id === row.id) {
                    data = row;
                    break;
                }else if(!id) {
                    data.push(row);
                }
            }
        }
    }
    return data;
}

/**
 * 在某資料表取得單元格資料([columns][rows]的型式)
 * @param {string} sheetTitle 資料表名稱
 * @param {number} rows 要讀取的列數(扣除表頭)
 * @param {number} columns 要讀取的欄數
 */
async function getCellArrayBySheetTitle(sheetTitle, rows, columns) {
    if(!rows || !columns) {
        console.error("缺少rows("+rows+")、columns("+columns+")");
    }

    //先讀取資料表
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n')
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetTitle];

    //處理資料
    let cellArray = [];
    if(typeof sheet === "undefined" || sheet == null) {
        console.error("查無資料表，sheetTitle: "+sheetTitle);
    }else {
        await sheet.loadCells({
            startRowIndex: 1,
            endRowIndex: rows+1,
            endColumnIndex: columns
        });
        //整理成[columns][rows]的型式
        for(let i = 0; i < columns; i++) {
            let subCellArray = [];
            for(let j = 1; j < rows+1; j++) {
                let cellValue = sheet.getCell(j, i).value;
                //字串型式須檢查是否有值
                if(typeof cellValue === "string") {
                    cellValue = cellValue.trim();
                    if(cellValue) {//有值才放
                        subCellArray.push(cellValue);
                    }
                //數字型式、布林型式直接放
                }else if(typeof cellValue === "number" || typeof cellValue === "boolean") {
                    subCellArray.push(cellValue);
                }
            }
            cellArray.push(subCellArray);
        }
    }
    return cellArray;
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
        console.log("儲存成功");
    //目前無資料(insert)
    }else {
        //先讀取資料表
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n')
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle[sheetTitle];
        if(typeof sheet === "undefined" || sheet == null) {
            console.error("查無資料表，sheetTitle: "+sheetTitle);
        }else {
            await sheet.addRow(data);
        }
    }
}

//給app.js、guess.js使用的
module.exports = {
    getDataBySheetTitle: getDataBySheetTitle,
    getCellArrayBySheetTitle: getCellArrayBySheetTitle,
    insertOrUpdateDataBySheetTitle: insertOrUpdateDataBySheetTitle
}