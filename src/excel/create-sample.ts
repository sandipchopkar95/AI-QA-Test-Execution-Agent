import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Test Cases");
ws.addRow(["Test Case ID","Test Scenario","Step No","Test Step","Expected Result","Test Data","User Role"]);
ws.addRows([
  ["TC001","Playwright Todo smoke test",1,"Navigate to https://demo.playwright.dev/todomvc","Todo application should be displayed","","PUBLIC"],
  ["TC001","Playwright Todo smoke test",2,'Add a todo item named "AI QA Demo"','Todo item "AI QA Demo" should be visible',"AI QA Demo","PUBLIC"],
  ["TC001","Playwright Todo smoke test",3,'Mark "AI QA Demo" as completed',"Todo item should be marked completed","AI QA Demo","PUBLIC"]
]);
ws.getRow(1).font = { bold: true };
ws.columns.forEach(c => { c.width = 28; });
await mkdir("test-data", { recursive: true });
await wb.xlsx.writeFile("test-data/sample-test-cases.xlsx");
console.log("Created test-data/sample-test-cases.xlsx");