import { clsx } from "clsx";
import { addHours, format, formatDistanceToNowStrict, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { colors } from "@lotosui/core";

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
      mergeAcross?: number;
      mergeDown?: number;
    };

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
  columns?: Array<number | { width: number }>;
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
  const sheetBackground = colors.light.background.primary;
  const sheetCard = colors.light.background.card;
  const headerColor = colors.deepNavy;
  const headerAccent = colors.accent.primary;
  const headerAccentStrong = colors.accent.active;
  const borderSoft = "#D7DEEE";
  const borderStrong = "#B9C4DD";
  const textPrimary = colors.light.foreground.primary;
  const textSecondary = "#5A647C";

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
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="${textPrimary}"/>
   <Interior ss:Color="${sheetCard}" ss:Pattern="Solid"/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="title">
   <Font ss:FontName="Aptos Display" ss:Bold="1" ss:Size="16" ss:Color="${colors.pureWhite}"/>
   <Interior ss:Color="${headerColor}" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerColor}"/>
   </Borders>
  </Style>
  <Style ss:ID="header">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${colors.pureWhite}"/>
   <Interior ss:Color="${headerAccent}" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerAccentStrong}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerAccentStrong}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerAccentStrong}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerAccentStrong}"/>
   </Borders>
  </Style>
  <Style ss:ID="section">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Size="12" ss:Color="${headerColor}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
   </Borders>
  </Style>
  <Style ss:ID="label">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${headerColor}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="subtle">
   <Font ss:FontName="Aptos" ss:Color="${textSecondary}"/>
  </Style>
  <Style ss:ID="body">
   <Font ss:FontName="Aptos" ss:Color="${textPrimary}"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="wrap">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="currency">
   <NumberFormat ss:Format="&quot;$&quot;#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="percent">
   <NumberFormat ss:Format="0.0%"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="integer">
   <NumberFormat ss:Format="0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="kpiValue">
   <Font ss:FontName="Aptos Display" ss:Bold="1" ss:Size="13" ss:Color="${headerColor}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
   </Borders>
  </Style>
  <Style ss:ID="good">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${colors.status.success}"/>
  </Style>
  <Style ss:ID="warning">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${colors.status.warning}"/>
  </Style>
  <Style ss:ID="critical">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${colors.status.error}"/>
  </Style>
  <Style ss:ID="hero">
   <Font ss:FontName="Aptos Display" ss:Bold="1" ss:Size="18" ss:Color="${colors.pureWhite}"/>
   <Interior ss:Color="${headerColor}" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerColor}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerColor}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerColor}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${headerColor}"/>
   </Borders>
  </Style>
  <Style ss:ID="heroSubtle">
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="${colors.light.foreground.secondary}"/>
   <Interior ss:Color="${headerColor}" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="cardLabel">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Size="10" ss:Color="${textSecondary}"/>
   <Interior ss:Color="${sheetCard}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
   </Borders>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="cardValue">
   <Font ss:FontName="Aptos Display" ss:Bold="1" ss:Size="16" ss:Color="${headerColor}"/>
   <Interior ss:Color="${sheetCard}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
   </Borders>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="cardNote">
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="${textSecondary}"/>
   <Interior ss:Color="${sheetCard}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderStrong}"/>
   </Borders>
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="chartLabel">
   <Font ss:FontName="Aptos" ss:Bold="1" ss:Color="${headerColor}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="chartBar">
   <Font ss:FontName="Consolas" ss:Bold="1" ss:Size="10" ss:Color="${headerAccent}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="chartBarCool">
   <Font ss:FontName="Consolas" ss:Bold="1" ss:Size="10" ss:Color="${colors.oceanBlue}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
  <Style ss:ID="chartBarSuccess">
   <Font ss:FontName="Consolas" ss:Bold="1" ss:Size="10" ss:Color="${colors.status.success}"/>
   <Interior ss:Color="${sheetBackground}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${borderSoft}"/>
   </Borders>
  </Style>
 </Styles>
 ${sheets
   .map((sheet) => {
     const columns = (sheet.columns ?? [])
       .map((column) => {
         const width = typeof column === "number" ? column : column.width;
         return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
       })
       .join("");
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
             const mergeAcross = normalized.mergeAcross ? ` ss:MergeAcross="${normalized.mergeAcross}"` : "";
             const mergeDown = normalized.mergeDown ? ` ss:MergeDown="${normalized.mergeDown}"` : "";
             return `   <Cell${style}${mergeAcross}${mergeDown}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
           })
           .join("");

         return `  <Row>${cells}</Row>`;
       })
       .join("");

     return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${columns}${rows}</Table></Worksheet>`;
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

export function openPrintHtmlDocument(title: string, html: string) {
  const documentHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeXml(title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: ${colors.light.background.primary};
        color: ${colors.light.foreground.primary};
      }

      body {
        font-family: Inter, Aptos, "Segoe UI", sans-serif;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      @media print {
        html, body {
          background: white;
        }
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");
  if (!popup) {
    URL.revokeObjectURL(url);
    return false;
  }

  const printPopup = () => {
    try {
      popup.focus();
      popup.print();
    } finally {
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    }
  };

  try {
    popup.addEventListener("load", () => {
      window.setTimeout(printPopup, 180);
    }, { once: true });
  } catch {
    window.setTimeout(printPopup, 600);
  }

  window.setTimeout(printPopup, 1_200);
  return true;
}
