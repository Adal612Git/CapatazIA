import type {
  BellIncident,
  CreditFile,
  PostSaleFollowUp,
  Prospect,
  SalesOperation,
  TestDrive,
  User,
} from "@/lib/types";

export const prospectStatusLabels: Record<Prospect["status"], string> = {
  new: "Nuevo",
  follow_up: "Seguimiento",
  test_drive: "Prueba",
  negotiation: "Negociacion",
  closed_won: "Ganado",
  closed_lost: "Perdido",
};

export const testDriveStatusLabels: Record<TestDrive["status"], string> = {
  scheduled: "Agendada",
  completed: "Completada",
  no_show: "No show",
};

export const salesStageLabels: Record<SalesOperation["stage"], string> = {
  prospecting: "Prospeccion",
  test_drive: "Prueba",
  negotiation: "Negociacion",
  credit_review: "Credito",
  ready_to_close: "Lista para cierre",
  closed_won: "Ganada",
  closed_lost: "Perdida",
};

export const creditStatusLabels: Record<CreditFile["status"], string> = {
  collecting: "Recolectando",
  missing_documents: "Faltan docs",
  submitted: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  cash_sale: "Contado",
};

export const postSaleStatusLabels: Record<PostSaleFollowUp["status"], string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  at_risk: "En riesgo",
  closed: "Cerrado",
};

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export interface AgencyMetric {
  agency: string;
  activeProspects: number;
  scheduledTestDrives: number;
  activeOperations: number;
  readyToClose: number;
  wonOperations: number;
  openIncidents: number;
  atRiskPostSale: number;
  missingCreditFiles: number;
  creditApprovalRate: number;
}

export function collectAgencyNames({
  users,
  prospects,
  testDrives,
  salesOperations,
  creditFiles,
  incidents,
  followUps,
}: {
  users: User[];
  prospects: Prospect[];
  testDrives: TestDrive[];
  salesOperations: SalesOperation[];
  creditFiles: CreditFile[];
  incidents: BellIncident[];
  followUps: PostSaleFollowUp[];
}) {
  return Array.from(
    new Set(
      [
        ...users.map((user) => user.site),
        ...prospects.map((item) => item.agency),
        ...testDrives.map((item) => item.agency),
        ...salesOperations.map((item) => item.agency),
        ...creditFiles.map((item) => item.agency),
        ...incidents.map((item) => item.agency),
        ...followUps.map((item) => item.agency),
      ].filter((agency) => agency && !agency.toLowerCase().includes("corporativo")),
    ),
  );
}

export function buildAgencyMetrics({
  agencies,
  prospects,
  testDrives,
  salesOperations,
  creditFiles,
  incidents,
  followUps,
}: {
  agencies: string[];
  prospects: Prospect[];
  testDrives: TestDrive[];
  salesOperations: SalesOperation[];
  creditFiles: CreditFile[];
  incidents: BellIncident[];
  followUps: PostSaleFollowUp[];
}) {
  return agencies.map((agency) => {
    const agencyOperations = salesOperations.filter((operation) => operation.agency === agency);
    const decidedCredit = creditFiles.filter(
      (creditFile) => creditFile.agency === agency && (creditFile.status === "approved" || creditFile.status === "rejected"),
    );
    const approvedCredit = decidedCredit.filter((creditFile) => creditFile.status === "approved");

    return {
      agency,
      activeProspects: prospects.filter(
        (prospect) => prospect.agency === agency && prospect.status !== "closed_won" && prospect.status !== "closed_lost",
      ).length,
      scheduledTestDrives: testDrives.filter((testDrive) => testDrive.agency === agency && testDrive.status === "scheduled").length,
      activeOperations: agencyOperations.filter(
        (operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost",
      ).length,
      readyToClose: agencyOperations.filter((operation) => operation.stage === "ready_to_close").length,
      wonOperations: agencyOperations.filter((operation) => operation.stage === "closed_won").length,
      openIncidents: incidents.filter((incident) => incident.agency === agency && incident.status !== "resolved").length,
      atRiskPostSale: followUps.filter((followUp) => followUp.agency === agency && followUp.status === "at_risk").length,
      missingCreditFiles: creditFiles.filter((creditFile) => creditFile.agency === agency && creditFile.status === "missing_documents").length,
      creditApprovalRate: decidedCredit.length ? Math.round((approvedCredit.length / decidedCredit.length) * 100) : 0,
    } satisfies AgencyMetric;
  });
}
