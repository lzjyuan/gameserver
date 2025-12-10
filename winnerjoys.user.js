// ==UserScript==
// @name         导出数据
// @namespace    http://tampermonkey.net/
// @version      5.1
// @match        *://winnerjoys.com/*
// @grant        none
// ==/UserScript==

// ------------- 只在 iframe 执行 -------------
if (window.self === window.top) {
    console.log("主页面，跳过脚本");
    return;
}

(function () {
    'use strict';

    const TODAY = new Date().toISOString().slice(0, 10);
    const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

    function loadXLSX(cb) {
        if (window.XLSX) return cb();
        const js = document.createElement("script");
        js.src = XLSX_URL;
        js.onload = cb;
        document.body.appendChild(js);
    }

    function exportExcel() {
        loadXLSX(() => {

            const tableRows = document.querySelectorAll("table.layui-table tbody tr");
            let rowOutput = {};   // 只生成一个对象（对应 Excel 第二行）

            tableRows.forEach(tr => {
                const dateCell = tr.querySelector("td[data-field='date'] div");
                if (!dateCell) return;

                const rowDate = dateCell.innerText.trim();
                if (rowDate !== TODAY) return;

                const game = tr.querySelector("td[data-field='game'] div")?.innerText.trim() || "";
                if (!game) return;

                const totalPlay = Number(tr.querySelector("td[data-field='totalPlay']")?.getAttribute("data-content") || 0);
                const totalWin  = Number(tr.querySelector("td[data-field='totalWin']")?.getAttribute("data-content") || 0);
                const diff = totalPlay - totalWin;

                // 写入横向数据
                rowOutput[`${game}_totalPlay`] = totalPlay;
                rowOutput[`${game}_totalWin`]  = totalWin;
                rowOutput[`${game}_diff`]      = diff;
            });

            if (Object.keys(rowOutput).length === 0) {
                alert(`今日（${TODAY}）没有数据`);
                return;
            }

            // 将 rowOutput 作为第二行导出
            const outputRows = [ rowOutput ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(outputRows);
            XLSX.utils.book_append_sheet(wb, ws, "Matrix");

            XLSX.writeFile(wb, `matrix_row2_${TODAY}.xlsx`);
        });
    }

    function createBtn() {
        if (document.getElementById("export_matrix_btn")) return;

        const btn = document.createElement("button");
        btn.id = "export_matrix_btn";
        btn.innerText = `导出 ${TODAY} 数据`;

        btn.style.position = "fixed";
        btn.style.top = "80px";
        btn.style.right = "40px";
        btn.style.background = "#FF9800";
        btn.style.color = "#fff";
        btn.style.padding = "10px 15px";
        btn.style.borderRadius = "6px";
        btn.style.zIndex = "999999";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "14px";

        btn.onclick = exportExcel;

        document.body.appendChild(btn);
    }

    window.addEventListener("load", createBtn);
    setTimeout(createBtn, 2000);

})();
