// ==UserScript==
// @name         导出当天数据（含差值 diff） Final
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  自动提取今天的指定字段（含 totalPlay - totalWin 差值）导出 Excel，不重复按钮
// @match        *://winnerjoys.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // ---------------------------------
    // 获取今天 YYYY-MM-DD
    // ---------------------------------
    function getToday() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    const TODAY = getToday();
    console.log("今日日期:", TODAY);

    const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

    function loadXLSX(callback) {
        if (window.XLSX) return callback(); // 已加载
        let s = document.createElement('script');
        s.src = XLSX_URL;
        s.onload = callback;
        document.body.appendChild(s);
    }

    // ---------------------------------
    // 导出 Excel 功能
    // ---------------------------------
    function exportExcel() {
        loadXLSX(() => {
            console.log("XLSX loaded.");

            let rows = [];

            document.querySelectorAll("table.layui-table tbody tr").forEach(tr => {
                const dateCell = tr.querySelector("td[data-field='date'] div");
                if (!dateCell) return;

                const rowDate = dateCell.innerText.trim();
                if (rowDate !== TODAY) return;

                const totalPlayRaw = tr.querySelector("td[data-field='totalPlay']")?.getAttribute("data-content") || "0";
                const totalWinRaw = tr.querySelector("td[data-field='totalWin']")?.getAttribute("data-content") || "0";

                const totalPlay = Number(totalPlayRaw);
                const totalWin = Number(totalWinRaw);
                const diff = totalPlay - totalWin;

                rows.push({
                    date: rowDate,
                    game: tr.querySelector("td[data-field='game'] div")?.innerText.trim() || "",
                    totalPlay,
                    totalWin,
                    diff
                });
            });

            if (rows.length === 0) {
                alert(`今日（${TODAY}）无数据！`);
                return;
            }

            let wb = XLSX.utils.book_new();
            let ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "Today");

            XLSX.writeFile(wb, `today_data_${TODAY}.xlsx`);
        });
    }

    // ---------------------------------
    // 创建不重复按钮
    // ---------------------------------
    function createButton() {
        if (document.querySelector("#export_today_btn")) return; // 已存在按钮

        const btn = document.createElement("button");
        btn.id = "export_today_btn";
        btn.innerText = `导出当天 ${TODAY} Excel`;
        btn.style = `
            position: fixed;
            top: 80px;
            right: 30px;
            z-index: 999999;
            padding: 10px 15px;
            background: #1E9FFF;
            color: #fff;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        document.body.appendChild(btn);

        btn.onclick = exportExcel;
    }

    // 等页面加载后创建按钮
    window.addEventListener("load", createButton);
    setTimeout(createButton, 2000);  // 兼容 Ajax 加载页面

})();
