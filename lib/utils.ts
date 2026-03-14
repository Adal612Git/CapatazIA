import { clsx } from "clsx";
import { addHours, format, formatDistanceToNowStrict, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatDateTime(value: string) {
  return format(parseISO(value), "dd MMM, HH:mm", { locale: es });
}

export function formatDateTimeInput(value: string) {
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

export function relativeTime(value: string) {
  return formatDistanceToNowStrict(parseISO(value), { locale: es, addSuffix: true });
}

export function isOverdue(value: string) {
  return isPast(parseISO(value));
}

export function defaultDueAtInput() {
  const next = addHours(new Date(), 4);
  next.setMinutes(0, 0, 0);
  return format(next, "yyyy-MM-dd'T'HH:mm");
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type SpreadsheetValue = string | number | boolean | null | undefined;

export type SpreadsheetCell =
  | SpreadsheetValue
  | {
      value: SpreadsheetValue;
      styleId?: string;
      type?: "String" | "Number" | "Boolean";
    };

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeSpreadsheetCell(cell: SpreadsheetCell) {
  if (typeof cell === "object" && cell !== null && "value" in cell) {
    return cell;
  }

  return { value: cell };
}

function detectSpreadsheetType(value: SpreadsheetValue): "String" | "Number" | "Boolean" {
  if (typeof value === "number") {
    return "Number";
  }
  if (typeof value === "boolean") {
    return "Boolean";
  }
  return "String";
}

export function downloadSpreadsheetXml(filename: string, workbookTitle: string, sheets: SpreadsheetSheet[]) {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(workbookTitle)}</Title>
  <Author>Capataz AI</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#2B211B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="title">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="15" ss:Color="#8C3A0B"/>
   <Interior ss:Color="#FFF2E8" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="header">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#F07A2B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D96519"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D96519"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D96519"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D96519"/>
   </Borders>
  </Style>
  <Style ss:ID="label">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#8C5B33"/>
   <Interior ss:Color="#FFF7F1" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="subtle">
   <Font ss:FontName="Calibri" ss:Color="#6B5A4F"/>
  </Style>
  <Style ss:ID="wrap">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="currency">
   <NumberFormat ss:Format="&quot;$&quot;#,##0"/>
  </Style>
  <Style ss:ID="percent">
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="integer">
   <NumberFormat ss:Format="0"/>
  </Style>
 </Styles>
 ${sheets
   .map((sheet) => {
     const rows = sheet.rows
       .map((row) => {
         const cells = row
           .map((cell) => {
             const normalized = normalizeSpreadsheetCell(cell);
             const type = normalized.type ?? detectSpreadsheetType(normalized.value);
             const value =
               normalized.value === null || normalized.value === undefined
                 ? ""
                 : type === "Boolean"
                   ? normalized.value
                     ? "1"
                     : "0"
                   : String(normalized.value);
             const style = normalized.styleId ? ` ss:StyleID="${normalized.styleId}"` : "";
             return `   <Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
           })
           .join("");

         return `  <Row>${cells}</Row>`;
       })
       .join("");

     return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rows}</Table></Worksheet>`;
   })
   .join("")}
</Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
