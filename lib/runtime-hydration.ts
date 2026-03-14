import { seedData } from "@/lib/seed-data";
import type {
  BellIncident,
  CreditFile,
  OrgScope,
  PostSaleFollowUp,
  Prospect,
  RuntimeSyncPayload,
  SalesOperation,
  ScheduledBroadcast,
  TestDrive,
  User,
} from "@/lib/types";

const seedUserById = new Map(seedData.users.map((user) => [user.id, user]));
const defaultScopedUser = seedData.users.find((user) => user.siteId !== "site-corporativo") ?? seedData.users[0];
const agencyScopeByName = new Map(
  seedData.users
    .filter((user) => user.siteId !== "site-corporativo")
    .map((user) => [user.site.toLowerCase(), { groupId: user.groupId, brandId: user.brandId, siteId: user.siteId }]),
);

function fallbackScope(agency?: string, userId?: string): OrgScope {
  const fromUser = userId ? seedUserById.get(userId) : null;
  const fromAgency = agency ? agencyScopeByName.get(agency.toLowerCase()) : null;
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

export function hydrateUsers(users: User[]) {
  return users.map((user) => {
    const seedUser = seedUserById.get(user.id);
    const scopedSeedUser = seedUser ?? seedData.users.find((candidate) => candidate.site === user.site) ?? defaultScopedUser;

    return {
      ...user,
      department: user.department ?? seedUser?.department ?? "sales",
      groupId: user.groupId ?? scopedSeedUser.groupId,
      brandId: user.brandId ?? scopedSeedUser.brandId,
      siteId: user.siteId ?? scopedSeedUser.siteId,
    };
  });
}

export function hydrateProspects(prospects: Prospect[]) {
  return prospects.map((prospect) => {
    const seedProspect = seedData.prospects.find((candidate) => candidate.id === prospect.id);
    return mergeScope(prospect, seedProspect ?? fallbackScope(prospect.agency, prospect.salespersonId));
  });
}

export function hydrateTestDrives(testDrives: TestDrive[]) {
  return testDrives.map((testDrive) => {
    const seedTestDrive = seedData.testDrives.find((candidate) => candidate.id === testDrive.id);
    return mergeScope(testDrive, seedTestDrive ?? fallbackScope(testDrive.agency, testDrive.salespersonId));
  });
}

export function hydrateSalesOperations(salesOperations: SalesOperation[]) {
  return salesOperations.map((operation) => {
    const seedOperation = seedData.salesOperations.find((candidate) => candidate.id === operation.id);
    return mergeScope(operation, seedOperation ?? fallbackScope(operation.agency, operation.salespersonId));
  });
}

export function hydrateCreditFiles(creditFiles: CreditFile[]) {
  return creditFiles.map((creditFile) => {
    const seedCreditFile = seedData.creditFiles.find((candidate) => candidate.id === creditFile.id);
    return mergeScope(creditFile, seedCreditFile ?? fallbackScope(creditFile.agency, creditFile.salespersonId));
  });
}

export function hydrateBellIncidents(bellIncidents: BellIncident[]) {
  return bellIncidents.map((incident) => {
    const seedIncident = seedData.bellIncidents.find((candidate) => candidate.id === incident.id);
    return mergeScope(incident, seedIncident ?? fallbackScope(incident.agency, incident.ownerId));
  });
}

export function hydratePostSaleFollowUps(postSaleFollowUps: PostSaleFollowUp[]) {
  return postSaleFollowUps.map((followUp) => {
    const seedFollowUp = seedData.postSaleFollowUps.find((candidate) => candidate.id === followUp.id);
    return mergeScope(followUp, seedFollowUp ?? fallbackScope(followUp.agency, followUp.salespersonId));
  });
}

export function hydrateScheduledBroadcasts(scheduledBroadcasts: ScheduledBroadcast[] | undefined) {
  if (!scheduledBroadcasts?.length) {
    return seedData.scheduledBroadcasts.map((broadcast) => ({ ...broadcast }));
  }

  return scheduledBroadcasts.map((broadcast) => {
    const seedBroadcast = seedData.scheduledBroadcasts.find((candidate) => candidate.id === broadcast.id);

    return {
      ...broadcast,
      title: broadcast.title ?? seedBroadcast?.title ?? "Broadcast operativo",
      message: broadcast.message ?? seedBroadcast?.message ?? "Mensaje programado de Capataz.",
      audience: broadcast.audience ?? seedBroadcast?.audience ?? "all_staff",
      frequency: broadcast.frequency ?? seedBroadcast?.frequency ?? "daily",
      timeOfDay: broadcast.timeOfDay ?? seedBroadcast?.timeOfDay ?? "08:00",
      timezone: broadcast.timezone ?? seedBroadcast?.timezone ?? seedData.workspace.timezone,
      active: broadcast.active ?? seedBroadcast?.active ?? true,
      audioLabel: broadcast.audioLabel ?? seedBroadcast?.audioLabel,
      lastSentOn: broadcast.lastSentOn ?? seedBroadcast?.lastSentOn,
    };
  });
}

export function hydrateRuntimePayload(payload: RuntimeSyncPayload): RuntimeSyncPayload {
  return {
    ...payload,
    users: hydrateUsers(payload.users),
    prospects: hydrateProspects(payload.prospects),
    testDrives: hydrateTestDrives(payload.testDrives),
    salesOperations: hydrateSalesOperations(payload.salesOperations),
    creditFiles: hydrateCreditFiles(payload.creditFiles),
    bellIncidents: hydrateBellIncidents(payload.bellIncidents),
    postSaleFollowUps: hydratePostSaleFollowUps(payload.postSaleFollowUps),
    scheduledBroadcasts: hydrateScheduledBroadcasts(payload.scheduledBroadcasts),
  };
}
