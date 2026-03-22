import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TransferRequest {
  fromWalletAccountId: string;
  beneficiaryId: string;
  amount: number;
  concept: string;
}

interface OrderIntentRequest {
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  rationale: string;
}

@Injectable()
export class DemoDataService {
  private readonly roadmap = [
    {
      id: 's0',
      horizon: 'Sprint 0',
      objective: 'Congelar alcance, skeleton y baseline de compliance',
      deliverable: 'Repo, API skeleton, shell visual y narrativa consistente',
      exitCriteria: 'Backlog listo para ejecutar sin humo',
      dependencies: ['Scope Fase 1', 'Claims permitidos', 'Provider shortlist'],
      status: 'active',
    },
    {
      id: 's1',
      horizon: 'Sprint 1',
      objective: 'Nucleo funcional de TPC',
      deliverable:
        'Onboarding, wallet ejecutiva, Mr. Shark, approvals, dashboard',
      exitCriteria: '6 flujos recorribles con mocks controlados',
      dependencies: ['WhatsApp setup', 'RBAC', 'Audit trail', 'Broker mock'],
      status: 'planned',
    },
    {
      id: 's2',
      horizon: 'Sprint 2',
      objective: 'Operacion VIP para piloto controlado',
      deliverable: 'Sandbox broker, smoke suite, observabilidad, runbook',
      exitCriteria: 'Demo/piloto repetible',
      dependencies: ['tastytrade sandbox', 'QA smoke', 'Readiness checklist'],
      status: 'planned',
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  private async getPrimaryOrganization() {
    return this.prisma.organization.findFirstOrThrow({
      orderBy: { created_at: 'asc' },
    });
  }

  private async getPrimaryUser() {
    return this.prisma.user.findFirstOrThrow({
      orderBy: { created_at: 'asc' },
    });
  }

  private async getTransferPolicy() {
    return this.prisma.approvalPolicy.findFirstOrThrow({
      where: { action_type: 'money_transfer' },
      orderBy: { created_at: 'asc' },
    });
  }

  private async getInvestmentPolicy() {
    return this.prisma.approvalPolicy.findFirstOrThrow({
      where: { action_type: 'order_intent' },
      orderBy: { created_at: 'asc' },
    });
  }

  async getOverview() {
    const [organization, currentUser, balances, approvals] = await Promise.all([
      this.getPrimaryOrganization(),
      this.getPrimaryUser(),
      this.getWalletBalances(),
      this.prisma.approval.count({ where: { status: 'pending' } }),
    ]);

    return {
      product: 'TPC Fintech',
      phase: 'Fase 1 · Wallet + Mr. Shark + Capataz + WhatsApp',
      promise:
        'Una sola interfaz para mover dinero, ver portafolio, aprobar y ejecutar operacion.',
      primaryChannel: 'WhatsApp Business Cloud API',
      architecture: [
        'Provider-agnostic',
        'Multi-tenant',
        'Audit-first',
        'Threshold-driven approvals',
      ],
      metrics: [
        {
          label: 'MVP demo',
          value: '6 flujos',
          hint: 'Onboarding, wallet, Mr. Shark, approvals, dashboard, portafolio',
          tone: 'cyan',
        },
        {
          label: 'Liquidez visible',
          value: `$${(balances.totalMxn + balances.totalUsd).toLocaleString('es-MX')}`,
          hint: 'Consolidado across executive wallets',
          tone: 'mint',
        },
        {
          label: 'Aprobaciones',
          value: `${approvals} pendientes`,
          hint: 'Thresholds + dual control',
          tone: 'gold',
        },
        {
          label: 'Riesgo dominante',
          value: 'Compliance',
          hint: 'Claims comerciales y sponsor regulatorio',
          tone: 'rose',
        },
      ],
      topRisks: [
        'Licencia/regulacion y claims comerciales',
        'Broker definitivo fuera del MVP',
        'RLS y cifrado de PII pendientes para produccion',
      ],
      organization: {
        id: organization.id,
        name: organization.name,
        segment: organization.segment,
        region: organization.region,
        regulatoryStatus: organization.regulatory_status,
      },
      currentUser: {
        id: currentUser.id,
        fullName: currentUser.full_name,
        title: currentUser.title,
        role: currentUser.role_label,
        organizationId: organization.id,
        riskProfile: currentUser.risk_profile_label,
      },
      roadmap: this.roadmap,
    };
  }

  async getOrganizations() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { created_at: 'asc' },
    });

    return organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      segment: organization.segment,
      region: organization.region,
      regulatoryStatus: organization.regulatory_status,
    }));
  }

  async getCurrentUser() {
    const [organization, user] = await Promise.all([
      this.getPrimaryOrganization(),
      this.getPrimaryUser(),
    ]);

    return {
      id: user.id,
      fullName: user.full_name,
      title: user.title,
      role: user.role_label,
      organizationId: organization.id,
      riskProfile: user.risk_profile_label,
    };
  }

  async getRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { created_at: 'asc' },
    });

    return Array.from(
      new Set([
        'Owner',
        'Admin',
        'Staff',
        'Viewer',
        ...roles.map((role) => role.name),
      ]),
    );
  }

  async getWalletAccounts() {
    const accounts = await this.prisma.walletAccount.findMany({
      orderBy: { created_at: 'asc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      kind: account.kind,
      currency: account.currency,
      available: account.available_balance,
      pending: account.pending_balance,
      alias: account.alias,
    }));
  }

  async getWalletBalances() {
    const accounts = await this.prisma.walletAccount.findMany();

    return {
      totalMxn: accounts
        .filter((account) => account.currency === 'MXN')
        .reduce((sum, account) => sum + account.available_balance, 0),
      totalUsd: accounts
        .filter((account) => account.currency === 'USD')
        .reduce((sum, account) => sum + account.available_balance, 0),
      asOf: new Date().toISOString(),
      threshold: (await this.getTransferPolicy()).threshold_amount,
    };
  }

  async getWalletMovements() {
    const [transfers, adHocEntries] = await Promise.all([
      this.prisma.moneyTransfer.findMany({
        include: {
          beneficiary: true,
          from_wallet_account: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { money_transfer_id: null },
        include: {
          ledger_account: {
            include: {
              wallet_account: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const transferMovements = transfers.map((transfer) => ({
      id: transfer.id,
      accountId: transfer.from_wallet_account_id,
      type:
        transfer.status === 'settled' && transfer.concept.includes('interna')
          ? 'internal_transfer'
          : 'outgoing',
      counterparty: transfer.beneficiary.name,
      amount: transfer.amount,
      status: transfer.status,
      createdAt: transfer.created_at.toISOString(),
      reference: transfer.reference,
    }));

    const entryMovements = adHocEntries.map((entry) => ({
      id: entry.id,
      accountId: entry.ledger_account.wallet_account_id,
      type: entry.amount >= 0 ? 'incoming' : 'outgoing',
      counterparty: entry.memo,
      amount: entry.amount,
      status: entry.status,
      createdAt: entry.created_at.toISOString(),
      reference: `LEDGER-${entry.id.slice(-6).toUpperCase()}`,
    }));

    return [...transferMovements, ...entryMovements].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async getBeneficiaries() {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      orderBy: { created_at: 'asc' },
    });

    return beneficiaries.map((beneficiary) => ({
      id: beneficiary.id,
      name: beneficiary.name,
      bank: beneficiary.bank,
      accountMask: beneficiary.account_mask,
      type: beneficiary.beneficiary_type,
    }));
  }

  async createTransfer(request: TransferRequest) {
    const [organization, user, beneficiary, policy, ledgerAccount] =
      await Promise.all([
        this.getPrimaryOrganization(),
        this.getPrimaryUser(),
        this.prisma.beneficiary.findUniqueOrThrow({
          where: { id: request.beneficiaryId },
        }),
        this.getTransferPolicy(),
        this.prisma.ledgerAccount.findFirstOrThrow({
          where: { wallet_account_id: request.fromWalletAccountId },
        }),
      ]);

    const createdAt = new Date();
    const requiresApproval = request.amount >= policy.threshold_amount;

    const approval = requiresApproval
      ? await this.prisma.approval.create({
          data: {
            organization_id: organization.id,
            policy_id: policy.id,
            requester_id: user.id,
            title: `Transferencia a ${beneficiary.name}`,
            amount: request.amount,
            status: 'pending',
            reason: request.concept,
            created_at: createdAt,
          },
        })
      : null;

    const transfer = await this.prisma.moneyTransfer.create({
      data: {
        organization_id: organization.id,
        from_wallet_account_id: request.fromWalletAccountId,
        beneficiary_id: request.beneficiaryId,
        approval_id: approval?.id,
        amount: request.amount * -1,
        status: requiresApproval ? 'pending_approval' : 'queued',
        concept: request.concept,
        reference: `TPC-TX-${Date.now().toString().slice(-6)}`,
        created_at: createdAt,
      },
    });

    await Promise.all([
      this.prisma.ledgerEntry.create({
        data: {
          organization_id: organization.id,
          ledger_account_id: ledgerAccount.id,
          money_transfer_id: transfer.id,
          amount: request.amount * -1,
          direction: 'debit',
          status: transfer.status,
          memo: beneficiary.name,
          created_at: createdAt,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          organization_id: organization.id,
          actor_id: user.id,
          action: 'transfer.requested',
          resource_type: 'money_transfer',
          resource_id: transfer.id,
          channel: 'dashboard',
          summary: `${request.concept} por ${request.amount.toLocaleString('es-MX')} ${requiresApproval ? 'entro a aprobacion' : 'quedo en cola de ejecucion'}`,
          created_at: createdAt,
        },
      }),
    ]);

    return {
      transfer: {
        id: transfer.id,
        accountId: transfer.from_wallet_account_id,
        type: 'outgoing',
        counterparty: beneficiary.name,
        amount: transfer.amount,
        status: transfer.status,
        createdAt: transfer.created_at.toISOString(),
        reference: transfer.reference,
      },
      requiresApproval,
      nextStep: requiresApproval
        ? 'La solicitud fue enviada a approvals.'
        : 'La transferencia quedo en cola para simulacion de settlement.',
    };
  }

  async getPortfolioSummary() {
    const portfolio = await this.prisma.portfolio.findFirstOrThrow({
      orderBy: { created_at: 'asc' },
    });

    return {
      id: portfolio.id,
      totalValue: portfolio.total_value,
      monthlyPerformancePct: portfolio.monthly_performance_pct,
      cashPct: portfolio.cash_pct,
      riskBand: portfolio.risk_band,
      benchmark: portfolio.benchmark,
    };
  }

  async getPortfolioPositions() {
    const positions = await this.prisma.portfolioPosition.findMany({
      orderBy: { market_value: 'desc' },
    });

    return positions.map((position) => ({
      id: position.id,
      symbol: position.symbol,
      name: position.name,
      weightPct: position.weight_pct,
      marketValue: position.market_value,
      pnlPct: position.pnl_pct,
      thesis: position.thesis,
    }));
  }

  async getRiskProfile() {
    const profile = await this.prisma.riskProfile.findFirstOrThrow({
      orderBy: { created_at: 'asc' },
    });

    return {
      label: profile.label,
      horizon: profile.horizon,
      restrictions: profile.restrictions.split('|'),
    };
  }

  async createOrderIntent(request: OrderIntentRequest) {
    const [organization, policy] = await Promise.all([
      this.getPrimaryOrganization(),
      this.getInvestmentPolicy(),
    ]);

    const createdAt = new Date();
    const requiresApproval = request.amount >= policy.threshold_amount;
    const user = await this.getPrimaryUser();

    const approval = requiresApproval
      ? await this.prisma.approval.create({
          data: {
            organization_id: organization.id,
            policy_id: policy.id,
            requester_id: user.id,
            title: `Intent ${request.side} ${request.symbol}`,
            amount: request.amount,
            status: 'pending',
            reason: request.rationale,
            created_at: createdAt,
          },
        })
      : null;

    await Promise.all([
      this.prisma.orderIntent.create({
        data: {
          organization_id: organization.id,
          portfolio_id: request.portfolioId,
          approval_id: approval?.id,
          symbol: request.symbol,
          side: request.side,
          amount: request.amount,
          rationale: request.rationale,
          status: requiresApproval ? 'pending_approval' : 'captured',
          created_at: createdAt,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          organization_id: organization.id,
          actor_id: user.id,
          action: 'order.intent.created',
          resource_type: 'order_intent',
          channel: 'dashboard',
          summary: `${request.side} ${request.symbol} por ${request.amount.toLocaleString('es-MX')} como intencion controlada`,
          created_at: createdAt,
        },
      }),
    ]);

    return {
      status: requiresApproval ? 'pending_approval' : 'captured',
      requiresApproval,
      narrative: `Se registro la intencion ${request.side} de ${request.symbol}. ${request.rationale}`,
    };
  }

  getCommands() {
    return [
      'liquidez',
      'transferir',
      'portafolio',
      'aprobaciones',
      'capataz',
      'riesgo',
    ];
  }

  async getSharkContext() {
    const memory = await this.prisma.agentMemory.findMany({
      orderBy: [{ confidence: 'desc' }, { created_at: 'desc' }],
      take: 3,
    });

    return {
      preferredChannel: 'WhatsApp',
      activePersona: 'Mr. Shark',
      memory: memory.map((item) => item.content),
    };
  }

  async chat(message: string) {
    const lowered = message.toLowerCase();

    if (lowered.includes('liquidez') || lowered.includes('saldo')) {
      const balances = await this.getWalletBalances();
      return {
        detectedIntent: 'liquidity_check',
        reply: `Liquidez consolidada: ${balances.totalMxn.toLocaleString('es-MX')} MXN y ${balances.totalUsd.toLocaleString('en-US')} USD. No veo riesgo inmediato de caja.`,
        requiresApproval: false,
        suggestedActions: [
          'Ver movimientos',
          'Preparar transferencia',
          'Compartir resumen por WhatsApp',
        ],
      };
    }

    if (lowered.includes('transfer')) {
      return {
        detectedIntent: 'transfer_request',
        reply:
          'Puedo preparar la transferencia. Si supera 50,000 MXN la voy a mandar a approvals antes de simular settlement.',
        requiresApproval: true,
        suggestedActions: [
          'Elegir beneficiario',
          'Definir monto',
          'Enviar a approval',
        ],
      };
    }

    if (lowered.includes('portafolio') || lowered.includes('portfolio')) {
      const summary = await this.getPortfolioSummary();
      return {
        detectedIntent: 'portfolio_summary',
        reply: `Portafolio total ${summary.totalValue.toLocaleString('es-MX')} MXN, cash ${summary.cashPct}% y performance mensual ${summary.monthlyPerformancePct}%.`,
        requiresApproval: false,
        suggestedActions: [
          'Ver posiciones',
          'Simular orden',
          'Revisar perfil de riesgo',
        ],
      };
    }

    if (lowered.includes('aprob')) {
      const pending = await this.prisma.approval.count({
        where: { status: 'pending' },
      });
      return {
        detectedIntent: 'approval_status',
        reply: `Hay ${pending} aprobaciones pendientes. La mas sensible ahora es la transferencia al proveedor estrategico.`,
        requiresApproval: false,
        suggestedActions: [
          'Abrir approvals',
          'Escalar a humano',
          'Ver audit trail',
        ],
      };
    }

    return {
      detectedIntent: 'concierge',
      reply:
        'Entendido. Puedo resolver liquidez, transferencias, portafolio, approvals y tareas de Capataz desde este mismo centro de comando.',
      requiresApproval: false,
      suggestedActions: [
        'Consultar liquidez',
        'Consultar portafolio',
        'Listar approvals',
      ],
    };
  }

  async getTasks() {
    const tasks = await this.prisma.task.findMany({
      include: { owner: true },
      orderBy: { due_at: 'asc' },
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      owner: task.owner.full_name,
      lane: task.lane,
      status: task.status,
      dueAt: task.due_at.toISOString(),
    }));
  }

  async getReminders() {
    const reminders = await this.prisma.reminder.findMany({
      orderBy: { due_at: 'asc' },
    });

    return reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      channel: reminder.channel,
      dueAt: reminder.due_at.toISOString(),
    }));
  }

  async getWorkflows() {
    const workflows = await this.prisma.workflowRun.findMany({
      include: { owner: true },
      orderBy: { created_at: 'asc' },
    });

    return workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      state: workflow.state,
      owner: workflow.owner?.full_name ?? 'Capataz',
    }));
  }

  async getApprovals() {
    const approvals = await this.prisma.approval.findMany({
      include: {
        policy: true,
        requester: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return approvals.map((approval) => ({
      id: approval.id,
      title: approval.title,
      amount: approval.amount,
      policy: `${approval.policy.name} > ${approval.policy.threshold_amount.toLocaleString('es-MX')} MXN`,
      status: approval.status,
      requester: approval.requester.full_name,
      createdAt: approval.created_at.toISOString(),
    }));
  }

  async getAuditEvents() {
    const events = await this.prisma.auditEvent.findMany({
      include: { actor: true },
      orderBy: { created_at: 'desc' },
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      resourceType: event.resource_type,
      actor: event.actor?.full_name ?? 'System',
      channel: event.channel,
      createdAt: event.created_at.toISOString(),
      summary: event.summary,
    }));
  }

  async getAuditMoneyMovements() {
    const transfers = await this.prisma.moneyTransfer.findMany({
      orderBy: { created_at: 'desc' },
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      reference: transfer.reference,
      amount: transfer.amount,
      status: transfer.status,
      createdAt: transfer.created_at.toISOString(),
    }));
  }

  async getAuditApprovals() {
    const approvals = await this.prisma.approval.findMany({
      include: { policy: true },
      orderBy: { created_at: 'desc' },
    });

    return approvals.map((approval) => ({
      id: approval.id,
      title: approval.title,
      status: approval.status,
      policy: approval.policy.name,
      createdAt: approval.created_at.toISOString(),
    }));
  }
}
