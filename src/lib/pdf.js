/**
 * 브라우저 파일 파서.
 * 텍스트형 파일은 구조적으로 추출하고, PDF/이미지처럼 시각 정보가 중요한 파일은
 * LLM에 직접 전달할 수 있도록 base64 첨부도 함께 만든다.
 */
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const TEXT_EXT = /\.(md|txt|markdown)$/i;
const CSV_EXT = /\.csv$/i;
const XLSX_EXT = /\.(xlsx|xls)$/i;
const PPTX_EXT = /\.pptx$/i;
const IMAGE_EXT = /\.(png|jpe?g)$/i;

export async function parsePdf(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = normalizeExtractedText(content.items.map((it) => it.str).join(' '));
    pages.push(pageText ? `[${i}페이지]\n${pageText}` : '');
  }
  const text = pages.filter(Boolean).join('\n\n').trim();
  const attachment = await makeAttachment(file, 'application/pdf');
  const poorText = isPoorPdfText(text);
  return result(file, poorText
    ? `${text}\n\n[안내] 이 PDF는 텍스트 레이어 품질이 낮습니다. 파일 입력 지원 모델(Gemini 권장)을 사용하면 원본 PDF를 함께 분석합니다.`.trim()
    : text, doc.numPages, attachment, { poorText });
}

export async function parseText(file) {
  return result(file, await file.text(), 1);
}

export async function parseCsv(file) {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string' });
  return result(file, workbookToMarkdown(workbook), 1);
}

export async function parseXlsx(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  return result(file, workbookToMarkdown(workbook), workbook.SheetNames.length);
}

export async function parsePptx(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  const slides = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('text');
    const n = name.match(/slide(\d+)/)?.[1];
    const text = extractPptxText(xml);
    if (text) slides.push(`[슬라이드 ${n}]\n${text}`);
  }
  return result(file, slides.join('\n\n'), slideFiles.length);
}

export async function parseImage(file) {
  const attachment = await makeAttachment(file, file.type || mimeFromName(file.name));
  return result(file, `[이미지 파일: ${file.name}]\n파일 입력 지원 모델에서 이미지를 직접 분석합니다.`, 1, attachment);
}

export async function parseFile(file) {
  if (!file) throw new Error('파일이 없습니다.');
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return parsePdf(file);
  if (XLSX_EXT.test(file.name)) return parseXlsx(file);
  if (CSV_EXT.test(file.name) || file.type === 'text/csv') return parseCsv(file);
  if (PPTX_EXT.test(file.name)) return parsePptx(file);
  if ((file.type && file.type.startsWith('image/')) || IMAGE_EXT.test(file.name)) return parseImage(file);
  if ((file.type && file.type.startsWith('text/')) || TEXT_EXT.test(file.name)) return parseText(file);
  throw new Error(`지원하지 않는 형식입니다: ${file.type || file.name}. PDF · MD · TXT · CSV · XLSX · PPTX · PNG · JPG를 지원합니다.`);
}

function result(file, text, pages = 1, attachment = null, meta = {}) {
  const clean = String(text || '').trim();
  return {
    filename: file.name,
    mimeType: file.type || mimeFromName(file.name),
    text: clean,
    pages,
    charCount: clean.length,
    attachment,
    ...meta,
  };
}

function workbookToMarkdown(workbook) {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
    const lines = rows
      .filter((row) => row.some((cell) => String(cell).trim()))
      .map((row) => row.map((cell) => String(cell).trim()).join(' | '));
    return `## 시트: ${name}\n${lines.join('\n')}`;
  }).join('\n\n');
}

function extractPptxText(xml) {
  const matches = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]).trim()).filter(Boolean);
  return matches.join('\n');
}

function decodeXml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeExtractedText(text) {
  return String(text || '')
    .replace(/[⚫◼◆●■◆]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPoorPdfText(text) {
  const source = String(text || '').trim();
  if (source.length < 20) return true;
  const readable = source.match(/[가-힣A-Za-z0-9]/g)?.length || 0;
  return readable / Math.max(source.length, 1) < 0.35;
}

async function makeAttachment(file, mimeType) {
  const base64 = await fileToBase64(file);
  return { filename: file.name, mimeType, base64 };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function mimeFromName(name) {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.csv$/i.test(name)) return 'text/csv';
  if (/\.pptx$/i.test(name)) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (/\.xlsx$/i.test(name)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'text/plain';
}
