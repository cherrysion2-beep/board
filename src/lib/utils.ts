import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { Announcement } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'daily_bulletin_announcements';

export const storage = {
  getAnnouncements: (): Announcement[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveAnnouncements: (announcements: Announcement[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
  },
};

export const excelUtils = {
  exportToExcel: (data: Announcement[]) => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      '日期': item.date,
      '類別': item.category,
      '標題': item.title,
      '內容': item.content,
      '發布人': item.author,
      '建立時間': item.createdAt,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Announcements");
    XLSX.writeFile(wb, `bulletin_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  importFromExcel: (file: File): Promise<Partial<Announcement>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          const formattedData = jsonData.map(row => ({
            date: row['日期'] || new Date().toISOString().split('T')[0],
            category: row['類別'] || '一般',
            title: row['標題'] || '無標題',
            content: row['內容'] || '',
            author: row['發布人'] || '系統匯入',
          }));
          
          resolve(formattedData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },
};

export const wordUtils = {
  exportToWord: async (data: Announcement[]) => {
    const tableHeader = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "日期", bold: true })] })], backgroundColor: "#F3F4F6" }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "類別", bold: true })] })], backgroundColor: "#F3F4F6" }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "標題", bold: true })] })], backgroundColor: "#F3F4F6" }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "內容", bold: true })] })], backgroundColor: "#F3F4F6" }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "發布人", bold: true })] })], backgroundColor: "#F3F4F6" }),
      ],
    });

    const rows = data.map(item => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(item.date)] }),
        new TableCell({ children: [new Paragraph(item.category)] }),
        new TableCell({ children: [new Paragraph(item.title)] }),
        new TableCell({ children: [new Paragraph(item.content)] }),
        new TableCell({ children: [new Paragraph(item.author)] }),
      ],
    }));

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [tableHeader, ...rows],
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: "公告事項匯出清單",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: `匯出日期: ${new Date().toLocaleDateString()}`, spacing: { after: 400 } }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `bulletin_export_${new Date().toISOString().split('T')[0]}.docx`);
  },

  importFromWord: async (file: File): Promise<Partial<Announcement>[]> => {
    const arrayBuffer = await file.arrayBuffer();
    // mammoth helps extract raw text or html
    // For "structured" import from Word, it's best to assume a table format.
    // Mammoth doesn't directly parse tables into JSON easily, but we can extract HTML and try.
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (!table) {
      throw new Error("Word 檔案中找不到表格。請確保檔案中包含公告資料表。");
    }

    const rows = Array.from(table.rows);
    if (rows.length < 2) throw new Error("表格中沒有資料。");

    const header = Array.from(rows[0].cells).map(c => c.textContent?.trim() || "");
    const dataRows = rows.slice(1);

    const findIndex = (names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));

    const dateIdx = findIndex(['日期', 'date']);
    const categoryIdx = findIndex(['類別', 'category']);
    const titleIdx = findIndex(['標題', 'title', 'subject']);
    const contentIdx = findIndex(['內容', 'content', 'body']);
    const authorIdx = findIndex(['發布', '人員', 'author']);

    return dataRows.map(row => {
      const cells = Array.from(row.cells);
      return {
        date: dateIdx !== -1 ? cells[dateIdx]?.textContent?.trim() : new Date().toISOString().split('T')[0],
        category: categoryIdx !== -1 ? cells[categoryIdx]?.textContent?.trim() : '一般',
        title: titleIdx !== -1 ? cells[titleIdx]?.textContent?.trim() : '無標題',
        content: contentIdx !== -1 ? cells[contentIdx]?.textContent?.trim() || '' : '',
        author: authorIdx !== -1 ? cells[authorIdx]?.textContent?.trim() || '系統匯入' : '系統匯入',
      };
    });
  },
};
