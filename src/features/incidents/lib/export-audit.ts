import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { incidentsApi } from "@/lib/api";

/**
 * Downloads an incident's full version history as CSV and hands it to the OS: a plain browser
 * download on web (desktop browsers do not support the Web Share API), the native share sheet on
 * a phone/tablet. Manager-only (the server enforces it too).
 */
export async function exportAuditCsv(incidentId: string): Promise<void> {
  const csv = await incidentsApi.auditExportCsv(incidentId);
  const filename = `incident-${incidentId}-audit.csv`;

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  await file.write(csv);

  // Open it directly (Quick Look / ACTION_VIEW) when the device can; Share is the fallback,
  // not the default - most people expect a tap to open the file, not a share sheet.
  if (await file.canPreview()) {
    await file.preview();
    return;
  }
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export audit" });
}
