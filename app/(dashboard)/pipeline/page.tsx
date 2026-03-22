"use client";

import { useMemo, useState } from "react";
import { CarFront, CircleDollarSign, FileSpreadsheet, Handshake, Plus } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { getDepartmentLabel, getDomainConfig } from "@/lib/domain-config";
import {
  canManageCommercialEntityByScope,
  canManageCreditFile,
  canManageProspect,
  canManageSalesOperation,
  canManageTestDrive,
  canViewCreditFile,
  canViewProspect,
  canViewSalesOperation,
  canViewTestDrive,
  isSalesUser,
} from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

function defaultTestDriveSlot() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(17, 0, 0, 0);
  return next.toISOString();
}

export default function PipelinePage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const users = useAppStore((state) => state.users);
  const prospects = useAppStore((state) => state.prospects);
  const testDrives = useAppStore((state) => state.testDrives);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const creditFiles = useAppStore((state) => state.creditFiles);
  const createProspect = useAppStore((state) => state.createProspect);
  const advanceProspectStatus = useAppStore((state) => state.advanceProspectStatus);
  const scheduleTestDrive = useAppStore((state) => state.scheduleTestDrive);
  const updateTestDriveStatus = useAppStore((state) => state.updateTestDriveStatus);
  const createSalesOperationFromProspect = useAppStore((state) => state.createSalesOperationFromProspect);
  const updateSalesOperationStage = useAppStore((state) => state.updateSalesOperationStage);
  const updateSalesOperation = useAppStore((state) => state.updateSalesOperation);
  const createCreditFileForOperation = useAppStore((state) => state.createCreditFileForOperation);
  const updateCreditFileStatus = useAppStore((state) => state.updateCreditFileStatus);
  const toggleCreditDocument = useAppStore((state) => state.toggleCreditDocument);
  const domain = getDomainConfig(systemMode);
  const { creditStatusLabels, prospectStatusLabels, salesStageLabels, testDriveStatusLabels } = domain;

  const sellers = users.filter((user) => user.role === "operator" && user.department === "sales");
  const visibleProspects = useMemo(
    () => (currentUser ? prospects.filter((prospect) => canViewProspect(currentUser, prospect)) : []),
    [currentUser, prospects],
  );
  const visibleTestDrives = useMemo(
    () => (currentUser ? testDrives.filter((testDrive) => canViewTestDrive(currentUser, testDrive)) : []),
    [currentUser, testDrives],
  );
  const visibleOperations = useMemo(
    () => (currentUser ? salesOperations.filter((operation) => canViewSalesOperation(currentUser, operation)) : []),
    [currentUser, salesOperations],
  );
  const visibleCreditFiles = useMemo(
    () => (currentUser ? creditFiles.filter((creditFile) => canViewCreditFile(currentUser, creditFile)) : []),
    [currentUser, creditFiles],
  );
  const visibleSellers = useMemo(
    () => (currentUser ? sellers.filter((seller) => canManageCommercialEntityByScope(currentUser, seller, seller.id)) : sellers),
    [currentUser, sellers],
  );

  const [prospectForm, setProspectForm] = useState({
    customerName: "",
    salespersonId: currentUser?.role === "operator" ? currentUser.id : visibleSellers[0]?.id ?? "",
    agency: currentUser?.site ?? visibleSellers[0]?.site ?? (systemMode === "hospital" ? "Hospital Santa Emilia Central" : "Volkswagen Puebla Centro"),
    source: systemMode === "hospital" ? "Consulta externa" : "Guardia piso",
    vehicleInterest: systemMode === "hospital" ? "Ingreso programado" : "Taos Highline",
    financingRequired: true,
    notes: "",
  });
  const [operationDrafts, setOperationDrafts] = useState<Record<string, { nextStep: string; closingProbability: string }>>({});

  const groupedProspects = useMemo(
    () => ({
      prospecting: visibleProspects.filter((prospect) => prospect.status === "new" || prospect.status === "follow_up"),
      testDrive: visibleProspects.filter((prospect) => prospect.status === "test_drive"),
      negotiation: visibleProspects.filter((prospect) => prospect.status === "negotiation"),
      closed: visibleProspects.filter((prospect) => prospect.status === "closed_won" || prospect.status === "closed_lost"),
    }),
    [visibleProspects],
  );

  if (!currentUser || !isSalesUser(currentUser)) {
    return (
      <div className="stack-lg">
        <ModuleHeader
          eyebrow="Pipeline comercial"
          title="Vista restringida por area"
          description="El pipeline comercial solo esta disponible para ventas, gerencia general y corporativo."
        />
        <section className="panel">
          <div className="status status-warning">
            Tu perfil actual pertenece a {currentUser ? getDepartmentLabel(systemMode, currentUser.department) : "otra area"} y no puede operar este pipeline.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Pipeline comercial"
        title={domain.pipelineTitle}
        description={domain.pipelineDescription}
        actions={<span className="report-chip">{systemMode === "hospital" ? "Admissions flow" : "Revenue flow"}</span>}
      />

      <section className="support-grid">
        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Alta rapida</p>
              <h3>Nuevo {domain.leadSingular}</h3>
            </div>
            <Plus className="icon-accent" size={18} />
          </div>
          <div className="form-grid">
            <label className="field">
              <span>{systemMode === "hospital" ? "Paciente" : "Cliente"}</span>
              <input
                value={prospectForm.customerName}
                onChange={(event) => setProspectForm((state) => ({ ...state, customerName: event.target.value }))}
                placeholder={systemMode === "hospital" ? "Nombre del paciente" : "Nombre del prospecto"}
              />
            </label>
            <label className="field">
              <span>{systemMode === "hospital" ? "Coordinador" : "Vendedor"}</span>
              <select
                value={prospectForm.salespersonId}
                onChange={(event) => {
                  const seller = visibleSellers.find((user) => user.id === event.target.value);
                  setProspectForm((state) => ({
                    ...state,
                    salespersonId: event.target.value,
                    agency: seller?.site ?? state.agency,
                  }));
                }}
              >
                {visibleSellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{systemMode === "hospital" ? "Hospital" : "Agencia"}</span>
              <input
                value={prospectForm.agency}
                onChange={(event) => setProspectForm((state) => ({ ...state, agency: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Fuente</span>
              <input
                value={prospectForm.source}
                onChange={(event) => setProspectForm((state) => ({ ...state, source: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>{domain.interestLabel}</span>
              <input
                value={prospectForm.vehicleInterest}
                onChange={(event) => setProspectForm((state) => ({ ...state, vehicleInterest: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Financiamiento</span>
              <select
                value={prospectForm.financingRequired ? "si" : "no"}
                onChange={(event) =>
                  setProspectForm((state) => ({ ...state, financingRequired: event.target.value === "si" }))
                }
              >
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="field field-span-2">
              <span>Notas</span>
              <textarea
                value={prospectForm.notes}
                onChange={(event) => setProspectForm((state) => ({ ...state, notes: event.target.value }))}
                placeholder={
                  systemMode === "hospital"
                    ? "Autorizacion pendiente, cama por confirmar, preparacion clinica..."
                    : "Enganche listo, usado a cuenta, descuento pendiente..."
                }
              />
            </label>
          </div>
          <button
            className="button-primary"
            type="button"
            onClick={() => {
              if (!currentUser || !prospectForm.customerName.trim()) {
                return;
              }

              const result = createProspect(
                {
                  ...prospectForm,
                  customerName: prospectForm.customerName.trim(),
                  notes: prospectForm.notes.trim(),
                },
                currentUser.id,
              );

              if (result.ok) {
                setProspectForm((state) => ({ ...state, customerName: "", notes: "" }));
              }
            }}
          >
            <Plus size={16} />
            Registrar {domain.leadSingular}
          </button>
        </article>

        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lectura rapida</p>
              <h3>Embudo vivo</h3>
            </div>
            <Handshake className="icon-accent icon-amber" size={18} />
          </div>
          <div className="hero-grid">
            <article className="metric-card soft-section">
              <div className="metric-top">
                <span className="metric-label">Prospectos</span>
                <Handshake className="icon-accent" size={16} />
              </div>
              <strong>{visibleProspects.filter((prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost").length}</strong>
              <p>{domain.leadPlural} vivas.</p>
            </article>
            <article className="metric-card soft-section">
              <div className="metric-top">
                <span className="metric-label">{systemMode === "hospital" ? "Valoraciones" : "Pruebas"}</span>
                <CarFront className="icon-accent" size={16} />
              </div>
              <strong>{visibleTestDrives.filter((testDrive) => testDrive.status === "scheduled").length}</strong>
              <p>{domain.testDrivePlural} de hoy.</p>
            </article>
            <article className="metric-card soft-section">
              <div className="metric-top">
                <span className="metric-label">{systemMode === "hospital" ? "Atenciones" : "Operaciones"}</span>
                <CircleDollarSign className="icon-accent" size={16} />
              </div>
              <strong>{visibleOperations.filter((operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost").length}</strong>
              <p>Vivas.</p>
            </article>
            <article className="metric-card soft-section">
              <div className="metric-top">
                <span className="metric-label">{systemMode === "hospital" ? "Autorizaciones" : "Expedientes"}</span>
                <FileSpreadsheet className="icon-accent" size={16} />
              </div>
              <strong>{visibleCreditFiles.filter((creditFile) => creditFile.status === "missing_documents").length}</strong>
              <p>Frenando cierres.</p>
            </article>
          </div>
        </article>
      </section>

      <section className="flow-grid">
        <article className="panel flow-column stack-sm">
          <div className="flow-column-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Ingreso" : "Prospeccion"}</p>
              <h3>{groupedProspects.prospecting.length}</h3>
            </div>
          </div>
          {groupedProspects.prospecting.map((prospect) => {
            const seller = users.find((user) => user.id === prospect.salespersonId);
            return (
              <div key={prospect.id} className="flow-card stack-sm">
                <div>
                  <strong>{prospect.customerName}</strong>
                  <p>{prospect.vehicleInterest}</p>
                  <small>
                    {seller?.name ?? "Sin vendedor"} · {prospectStatusLabels[prospect.status]}
                  </small>
                </div>
                <p>{prospect.notes}</p>
                <div className="flow-card-actions">
                  {currentUser && canManageProspect(currentUser, prospect) ? (
                    <>
                      <button className="button-secondary" type="button" onClick={() => advanceProspectStatus(prospect.id, "follow_up", currentUser.id)}>
                        {systemMode === "hospital" ? "Coordinar" : "Seguimiento"}
                      </button>
                      <button className="button-primary" type="button" onClick={() => scheduleTestDrive(prospect.id, defaultTestDriveSlot(), currentUser.id)}>
                        {systemMode === "hospital" ? "Agendar valoracion" : "Agendar prueba"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </article>

        <article className="panel flow-column stack-sm">
          <div className="flow-column-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Valoracion" : "Prueba de manejo"}</p>
              <h3>{groupedProspects.testDrive.length}</h3>
            </div>
          </div>
          {groupedProspects.testDrive.map((prospect) => {
            const drive = visibleTestDrives.find((entry) => entry.prospectId === prospect.id);
            return (
              <div key={prospect.id} className="flow-card stack-sm">
                <div>
                  <strong>{prospect.customerName}</strong>
                  <p>{prospect.vehicleInterest}</p>
                  <small>{drive ? `${testDriveStatusLabels[drive.status]} · ${formatDateTime(drive.scheduledAt)}` : "Sin agenda"}</small>
                </div>
                <div className="flow-card-actions">
                  {currentUser && (!drive || canManageTestDrive(currentUser, drive)) ? (
                    <>
                      {drive ? (
                        <>
                          <button className="button-secondary" type="button" onClick={() => updateTestDriveStatus(drive.id, "completed", currentUser.id)}>
                            {systemMode === "hospital" ? "Completar valoracion" : "Completar prueba"}
                          </button>
                          <button className="button-ghost" type="button" onClick={() => updateTestDriveStatus(drive.id, "no_show", currentUser.id)}>
                            No show
                          </button>
                        </>
                      ) : (
                        <button className="button-primary" type="button" onClick={() => scheduleTestDrive(prospect.id, defaultTestDriveSlot(), currentUser.id)}>
                          {systemMode === "hospital" ? "Crear valoracion" : "Crear agenda"}
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </article>

        <article className="panel flow-column stack-sm">
          <div className="flow-column-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Coordinacion" : "Negociacion"}</p>
              <h3>{groupedProspects.negotiation.length}</h3>
            </div>
          </div>
          {groupedProspects.negotiation.map((prospect) => {
            const operation = visibleOperations.find((entry) => entry.prospectId === prospect.id);
            return (
              <div key={prospect.id} className="flow-card stack-sm">
                <div>
                  <strong>{prospect.customerName}</strong>
                  <p>{prospect.vehicleInterest}</p>
                  <small>{operation ? salesStageLabels[operation.stage] : "Sin operacion"}</small>
                </div>
                <p>{operation?.nextStep ?? prospect.notes}</p>
                <div className="flow-card-actions">
                  {currentUser && canManageProspect(currentUser, prospect) ? (
                    <>
                      {!operation ? (
                        <button className="button-primary" type="button" onClick={() => createSalesOperationFromProspect(prospect.id, currentUser.id)}>
                          {systemMode === "hospital" ? "Abrir atencion" : "Abrir operacion"}
                        </button>
                      ) : (
                        <>
                          <button className="button-secondary" type="button" onClick={() => updateSalesOperationStage(operation.id, "credit_review", currentUser.id)}>
                            {systemMode === "hospital" ? "A autorizacion" : "A credito"}
                          </button>
                          <button className="button-primary" type="button" onClick={() => updateSalesOperationStage(operation.id, "ready_to_close", currentUser.id)}>
                            {systemMode === "hospital" ? "Lista para ingreso" : "Lista para cierre"}
                          </button>
                        </>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </article>

        <article className="panel flow-column stack-sm">
          <div className="flow-column-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Atendida" : "Cierre"}</p>
              <h3>{groupedProspects.closed.length}</h3>
            </div>
          </div>
          {groupedProspects.closed.map((prospect) => (
            <div key={prospect.id} className="flow-card stack-sm">
              <div>
                <strong>{prospect.customerName}</strong>
                <p>{prospect.vehicleInterest}</p>
                <small>{prospectStatusLabels[prospect.status]}</small>
              </div>
              <p>{prospect.notes}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="support-grid">
        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Operacion asistencial" : "Operacion de venta"}</p>
              <h3>{systemMode === "hospital" ? "Ingresos, probabilidad y siguiente paso" : "Cierres, probabilidad y siguiente paso"}</h3>
            </div>
            <CircleDollarSign className="icon-accent" size={18} />
          </div>
          <div className="stack-sm">
            {visibleOperations.map((operation) => {
              const draft = operationDrafts[operation.id] ?? {
                nextStep: operation.nextStep,
                closingProbability: String(operation.closingProbability),
              };
              const creditFile = visibleCreditFiles.find((entry) => entry.operationId === operation.id);
              return (
                <div key={operation.id} className="detail-card stack-sm">
                  <div className="panel-header">
                    <div>
                      <strong>{operation.customerName}</strong>
                      <p>
                        {operation.vehicleModel} · {salesStageLabels[operation.stage]}
                      </p>
                    </div>
                    <span className="pill pill-muted">{operation.closingProbability}%</span>
                  </div>
                  <div className="chip-row">
                    <span className="pill">{operation.agency}</span>
                    <span className="pill">{operation.financier}</span>
                    <span className="pill">{domain.subsidyLabel}: {operation.subsidyType}</span>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Siguiente paso</span>
                      <input
                        value={draft.nextStep}
                        onChange={(event) =>
                          setOperationDrafts((state) => ({
                            ...state,
                            [operation.id]: { ...draft, nextStep: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Probabilidad</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draft.closingProbability}
                        onChange={(event) =>
                          setOperationDrafts((state) => ({
                            ...state,
                            [operation.id]: { ...draft, closingProbability: event.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="flow-card-actions">
                    {currentUser && canManageSalesOperation(currentUser, operation) ? (
                      <>
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() =>
                            updateSalesOperation(
                              operation.id,
                              {
                                nextStep: draft.nextStep,
                                closingProbability: Number(draft.closingProbability || operation.closingProbability),
                              },
                              currentUser.id,
                            )
                          }
                        >
                          Guardar
                        </button>
                        {operation.financingRequired && !creditFile ? (
                          <button className="button-secondary" type="button" onClick={() => createCreditFileForOperation(operation.id, currentUser.id)}>
                            {systemMode === "hospital" ? "Abrir autorizacion" : "Abrir expediente"}
                          </button>
                        ) : null}
                        {operation.stage !== "ready_to_close" ? (
                          <button className="button-ghost" type="button" onClick={() => updateSalesOperationStage(operation.id, "ready_to_close", currentUser.id)}>
                            {systemMode === "hospital" ? "Pasar a ingreso" : "Pasar a cierre"}
                          </button>
                        ) : null}
                        {operation.stage !== "closed_won" ? (
                          <button className="button-primary" type="button" onClick={() => updateSalesOperationStage(operation.id, "closed_won", currentUser.id)}>
                            {systemMode === "hospital" ? "Atender" : "Ganar"}
                          </button>
                        ) : null}
                        {operation.stage !== "closed_lost" ? (
                          <button className="button-ghost" type="button" onClick={() => updateSalesOperationStage(operation.id, "closed_lost", currentUser.id)}>
                            {systemMode === "hospital" ? "Cancelar" : "Perder"}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Autorizacion y expediente" : "Expediente de credito"}</p>
              <h3>{systemMode === "hospital" ? "Documentos y dictamen asegurador" : "Documentos y dictamen"}</h3>
            </div>
            <FileSpreadsheet className="icon-accent" size={18} />
          </div>
          <div className="stack-sm">
            {visibleCreditFiles.map((creditFile) => (
              <div key={creditFile.id} className="detail-card stack-sm">
                <div className="panel-header">
                  <div>
                    <strong>{creditFile.customerName}</strong>
                    <p>{creditStatusLabels[creditFile.status]}</p>
                  </div>
                  <span className="pill pill-muted">{creditFile.financier}</span>
                </div>
                <div className="checkbox-grid">
                  {creditFile.requiredDocuments.map((document) => (
                    <label key={document} className="checkbox-row">
                      <input
                        checked={creditFile.receivedDocuments.includes(document)}
                        type="checkbox"
                        onChange={() => currentUser && toggleCreditDocument(creditFile.id, document, currentUser.id)}
                      />
                      <span>{document}</span>
                    </label>
                  ))}
                </div>
                <div className="flow-card-actions">
                  {currentUser && canManageCreditFile(currentUser, creditFile) ? (
                    <>
                      {creditFile.status !== "submitted" ? (
                        <button className="button-secondary" type="button" onClick={() => updateCreditFileStatus(creditFile.id, "submitted", currentUser.id)}>
                          {systemMode === "hospital" ? "Enviar a revision" : "Enviar"}
                        </button>
                      ) : null}
                      {creditFile.status !== "approved" ? (
                        <button className="button-primary" type="button" onClick={() => updateCreditFileStatus(creditFile.id, "approved", currentUser.id)}>
                          {systemMode === "hospital" ? "Autorizar" : "Aprobar"}
                        </button>
                      ) : null}
                      {creditFile.status !== "rejected" ? (
                        <button className="button-ghost" type="button" onClick={() => updateCreditFileStatus(creditFile.id, "rejected", currentUser.id)}>
                          Rechazar
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
