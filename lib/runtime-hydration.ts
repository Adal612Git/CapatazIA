import { getAppSeed } from "@/lib/app-seeds";
import type {
  BellIncident,
  CreditFile,
  OrgScope,
  PostSaleFollowUp,
  Prospect,
  RuntimeSyncPayload,
  SalesOperation,
  ScheduledBroadcast,
  SystemMode,
  TestDrive,
  User,
} from "@/lib/types";

function buildSeedIndexes(systemMode: SystemMode) {
  const seed = getAppSeed(systemMode);
  const seedUserById = new Map(seed.users.map((user) => [user.id, user]));
  const defaultScopedUser = seed.users.find((user) => user.siteId !== "site-corporativo") ?? seed.users[0];
  const scopeByName = new Map(
    seed.users
      .filter((user) => user.siteId !== "site-corporativo")
      .map((user) => [user.site.toLowerCase(), { groupId: user.groupId, brandId: user.brandId, siteId: user.siteId }]),
  );

  return {
    seed,
    seedUserById,
    defaultScopedUser,
    scopeByName,
  };
}

function fallbackScope(systemMode: SystemMode, agency?: string, userId?: string): OrgScope {
  const { seedUserById, scopeByName, defaultScopedUser } = buildSeedIndexes(systemMode);
  const fromUser = userId ? seedUserById.get(userId) : null;
  const fromAgency = agency ? scopeByName.get(agency.toLowerCase()) : null;
  const source = fromUser ?? fromAgency ?? defaultScopedUser;

  return {
    groupId: source.groupId,
    brandId: source.brandId,
    siteId: source.siteId,
  };
}

function mergeScope<T extends { groupId?: string; brandId?: string; siteId?: string }>(entity: T, scope: OrgScope): T {
  return {
    ...entity,
    groupId: entity.groupId ?? scope.groupId,
    brandId: entity.brandId ?? scope.brandId,
    siteId: entity.siteId ?? scope.siteId,
  };
}

export function hydrateUsers(users: User[], systemMode: SystemMode) {
  const { seed, seedUserById, defaultScopedUser } = buildSeedIndexes(systemMode);
  const hydratedUsers = users.map((user) => {
    const seedUser = seedUserById.get(user.id);
    const scopedSeedUser = seedUser ?? seed.users.find((candidate) => candidate.site === user.site) ?? defaultScopedUser;

    return {
      ...user,
      department: user.department ?? seedUser?.department ?? "sales",
      groupId: user.groupId ?? scopedSeedUser.groupId,
      brandId: user.brandId ?? scopedSeedUser.brandId,
      siteId: user.siteId ?? scopedSeedUser.siteId,
    };
  });

  const knownUserIds = new Set(hydratedUsers.map((user) => user.id));
  const missingSeedUsers = seed.users.filter((user) => !knownUserIds.has(user.id));

  return [...hydratedUsers, ...missingSeedUsers];
}

export function hydrateProspects(prospects: Prospect[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return prospects.map((prospect) => {
    const seedProspect = seed.prospects.find((candidate) => candidate.id === prospect.id);
    return mergeScope(prospect, seedProspect ?? fallbackScope(systemMode, prospect.agency, prospect.salespersonId));
  });
}

export function hydrateTestDrives(testDrives: TestDrive[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return testDrives.map((testDrive) => {
    const seedTestDrive = seed.testDrives.find((candidate) => candidate.id === testDrive.id);
    return mergeScope(testDrive, seedTestDrive ?? fallbackScope(systemMode, testDrive.agency, testDrive.salespersonId));
  });
}

export function hydrateSalesOperations(salesOperations: SalesOperation[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return salesOperations.map((operation) => {
    const seedOperation = seed.salesOperations.find((candidate) => candidate.id === operation.id);
    return mergeScope(operation, seedOperation ?? fallbackScope(systemMode, operation.agency, operation.salespersonId));
  });
}

export function hydrateCreditFiles(creditFiles: CreditFile[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return creditFiles.map((creditFile) => {
    const seedCreditFile = seed.creditFiles.find((candidate) => candidate.id === creditFile.id);
    return mergeScope(creditFile, seedCreditFile ?? fallbackScope(systemMode, creditFile.agency, creditFile.salespersonId));
  });
}

export function hydrateBellIncidents(bellIncidents: BellIncident[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return bellIncidents.map((incident) => {
    const seedIncident = seed.bellIncidents.find((candidate) => candidate.id === incident.id);
    return mergeScope(incident, seedIncident ?? fallbackScope(systemMode, incident.agency, incident.ownerId));
  });
}

export function hydratePostSaleFollowUps(postSaleFollowUps: PostSaleFollowUp[], systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  return postSaleFollowUps.map((followUp) => {
    const seedFollowUp = seed.postSaleFollowUps.find((candidate) => candidate.id === followUp.id);
    return mergeScope(followUp, seedFollowUp ?? fallbackScope(systemMode, followUp.agency, followUp.salespersonId));
  });
}

export function hydrateScheduledBroadcasts(scheduledBroadcasts: ScheduledBroadcast[] | undefined, systemMode: SystemMode) {
  const { seed } = buildSeedIndexes(systemMode);
  if (!scheduledBroadcasts?.length) {
    return seed.scheduledBroadcasts.map((broadcast) => ({ ...broadcast }));
  }

  return scheduledBroadcasts.map((broadcast) => {
    const seedBroadcast = seed.scheduledBroadcasts.find((candidate) => candidate.id === broadcast.id);

    return {
      ...broadcast,
      title: broadcast.title ?? seedBroadcast?.title ?? "Broadcast operativo",
      message: broadcast.message ?? seedBroadcast?.message ?? "Mensaje programado de Capataz.",
      audience: broadcast.audience ?? seedBroadcast?.audience ?? "all_staff",
      frequency: broadcast.frequency ?? seedBroadcast?.frequency ?? "daily",
      timeOfDay: broadcast.timeOfDay ?? seedBroadcast?.timeOfDay ?? "08:00",
      timezone: broadcast.timezone ?? seedBroadcast?.timezone ?? seed.workspace.timezone,
      active: broadcast.active ?? seedBroadcast?.active ?? true,
      audioLabel: broadcast.audioLabel ?? seedBroadcast?.audioLabel,
      lastSentOn: broadcast.lastSentOn ?? seedBroadcast?.lastSentOn,
    };
  });
}

export function hydrateRuntimePayload(payload: RuntimeSyncPayload): RuntimeSyncPayload {
  const seed = getAppSeed(payload.systemMode);

  return {
    ...payload,
    users: hydrateUsers(payload.users, payload.systemMode),
    prospects: hydrateProspects(payload.prospects, payload.systemMode),
    testDrives: hydrateTestDrives(payload.testDrives, payload.systemMode),
    salesOperations: hydrateSalesOperations(payload.salesOperations, payload.systemMode),
    creditFiles: hydrateCreditFiles(payload.creditFiles, payload.systemMode),
    bellIncidents: hydrateBellIncidents(payload.bellIncidents, payload.systemMode),
    postSaleFollowUps: hydratePostSaleFollowUps(payload.postSaleFollowUps, payload.systemMode),
    scheduledBroadcasts: hydrateScheduledBroadcasts(payload.scheduledBroadcasts, payload.systemMode),
    financeAccounts: payload.financeAccounts?.length ? payload.financeAccounts : seed.financeAccounts,
    financeMovements: payload.financeMovements?.length ? payload.financeMovements : seed.financeMovements,
    financeApplications: payload.financeApplications?.length ? payload.financeApplications : seed.financeApplications,
    financeInsights: payload.financeInsights?.length ? payload.financeInsights : seed.financeInsights,
    scoreSnapshots: payload.scoreSnapshots?.length ? payload.scoreSnapshots : seed.scoreSnapshots,
    weekly: payload.weekly?.length ? payload.weekly : seed.weekly,
  };
}
