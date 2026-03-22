import { scryptSync } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'DemoPass123!';

function hashPassword(password: string) {
  const salt = 'tpc-demo-salt';
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function main() {
  const organization = await prisma.organization.create({
    data: {
      name: 'TPC Executive Holdings',
      segment: 'VIP / business owner',
      region: 'Mexico',
      regulatory_status: 'Pending sponsor IFPE validation',
    },
  });

  const user = await prisma.user.create({
    data: {
      full_name: 'Rick Salinas',
      title: 'Founder & Principal',
      email: 'rick@tpc.demo',
      password_hash: hashPassword(DEMO_PASSWORD),
      role_label: 'Owner',
      risk_profile_label: 'Moderado agresivo',
    },
  });

  const role = await prisma.role.create({
    data: {
      name: 'Owner',
      scope: 'tenant',
      permissions: 'wallet:all,portfolio:all,approvals:all,ops:all',
    },
  });

  await prisma.organizationMembership.create({
    data: {
      organization_id: organization.id,
      user_id: user.id,
      role_id: role.id,
      hierarchy_level: 1,
      status: 'active',
      valid_from: new Date('2026-03-01T00:00:00Z'),
    },
  });

  await prisma.staffProfile.create({
    data: {
      organization_id: organization.id,
      user_id: user.id,
      specialty: 'Executive oversight',
      availability: '24/7',
      escalation_route: 'Compliance Ops > Human Ops',
      skills: 'capital allocation,approvals,wealth ops',
    },
  });

  await prisma.riskProfile.create({
    data: {
      organization_id: organization.id,
      user_id: user.id,
      label: 'Moderado agresivo',
      horizon: '36 meses',
      restrictions: 'Preservar liquidez operativa|Evitar concentracion > 20%',
    },
  });

  const operatingAccount = await prisma.walletAccount.create({
    data: {
      organization_id: organization.id,
      name: 'Executive Operating',
      kind: 'Operating',
      currency: 'MXN',
      available_balance: 3820000,
      pending_balance: 125000,
      alias: 'OPER-MX-01',
    },
  });

  const treasuryAccount = await prisma.walletAccount.create({
    data: {
      organization_id: organization.id,
      name: 'Treasury Reserve',
      kind: 'Treasury',
      currency: 'MXN',
      available_balance: 2100000,
      pending_balance: 0,
      alias: 'TRES-MX-01',
    },
  });

  await prisma.walletAccount.create({
    data: {
      organization_id: organization.id,
      name: 'Investment Bridge',
      kind: 'Bridge',
      currency: 'USD',
      available_balance: 126000,
      pending_balance: 3500,
      alias: 'BRDG-US-01',
    },
  });

  const operatingLedger = await prisma.ledgerAccount.create({
    data: {
      organization_id: organization.id,
      wallet_account_id: operatingAccount.id,
      code: '1000-OPER',
      name: 'Operating Cash',
      kind: 'asset',
      currency: 'MXN',
    },
  });

  const treasuryLedger = await prisma.ledgerAccount.create({
    data: {
      organization_id: organization.id,
      wallet_account_id: treasuryAccount.id,
      code: '1001-TRES',
      name: 'Treasury Cash',
      kind: 'asset',
      currency: 'MXN',
    },
  });

  const beneficiaryVendor = await prisma.beneficiary.create({
    data: {
      organization_id: organization.id,
      name: 'Proveedor Estrategico Delta',
      bank: 'BBVA',
      account_mask: '**** 3391',
      beneficiary_type: 'vendor',
    },
  });

  await prisma.beneficiary.createMany({
    data: [
      {
        organization_id: organization.id,
        name: 'Nomina Concierge',
        bank: 'Santander',
        account_mask: '**** 1044',
        beneficiary_type: 'payroll',
      },
      {
        organization_id: organization.id,
        name: 'Holding Patrimonial',
        bank: 'Banorte',
        account_mask: '**** 8840',
        beneficiary_type: 'internal',
      },
    ],
  });

  const transferPolicy = await prisma.approvalPolicy.create({
    data: {
      organization_id: organization.id,
      name: 'Dual approval transfer',
      action_type: 'money_transfer',
      threshold_amount: 50000,
      requires_manual_review: true,
    },
  });

  const investmentPolicy = await prisma.approvalPolicy.create({
    data: {
      organization_id: organization.id,
      name: 'Investment intent gate',
      action_type: 'order_intent',
      threshold_amount: 500000,
      requires_manual_review: true,
    },
  });

  const approvalTransfer = await prisma.approval.create({
    data: {
      organization_id: organization.id,
      policy_id: transferPolicy.id,
      requester_id: user.id,
      title: 'Transferencia a Proveedor Estrategico Delta',
      amount: 145000,
      status: 'pending',
      reason: 'Pago operativo VIP',
      created_at: new Date('2026-03-16T18:42:00Z'),
    },
  });

  const approvalIntent = await prisma.approval.create({
    data: {
      organization_id: organization.id,
      policy_id: investmentPolicy.id,
      requester_id: user.id,
      title: 'Orden sugerida NVDA',
      amount: 650000,
      status: 'escalated',
      reason: 'Intencion de compra con umbral elevado',
      created_at: new Date('2026-03-16T16:25:00Z'),
    },
  });

  await prisma.approval.create({
    data: {
      organization_id: organization.id,
      policy_id: transferPolicy.id,
      requester_id: user.id,
      title: 'Retiro ejecutivo',
      amount: 72000,
      status: 'approved',
      reason: 'Cobertura de gasto patrimonial',
      created_at: new Date('2026-03-15T23:04:00Z'),
    },
  });

  await prisma.moneyTransfer.create({
    data: {
      organization_id: organization.id,
      from_wallet_account_id: operatingAccount.id,
      beneficiary_id: beneficiaryVendor.id,
      approval_id: approvalTransfer.id,
      amount: -145000,
      status: 'pending_approval',
      concept: 'Pago operativo VIP',
      reference: 'TPC-TX-2408',
      created_at: new Date('2026-03-16T18:42:00Z'),
    },
  });

  await prisma.moneyTransfer.create({
    data: {
      organization_id: organization.id,
      from_wallet_account_id: treasuryAccount.id,
      beneficiary_id: beneficiaryVendor.id,
      amount: -300000,
      status: 'settled',
      concept: 'Transferencia interna de liquidez',
      reference: 'TPC-INT-1022',
      created_at: new Date('2026-03-15T11:20:00Z'),
      settled_at: new Date('2026-03-15T11:23:00Z'),
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        organization_id: organization.id,
        ledger_account_id: operatingLedger.id,
        amount: 480000,
        direction: 'credit',
        status: 'settled',
        memo: 'Cliente premium A',
        created_at: new Date('2026-03-16T14:10:00Z'),
      },
      {
        organization_id: organization.id,
        ledger_account_id: operatingLedger.id,
        amount: -145000,
        direction: 'debit',
        status: 'pending_approval',
        memo: 'Proveedor Estrategico Delta',
        created_at: new Date('2026-03-16T18:42:00Z'),
      },
      {
        organization_id: organization.id,
        ledger_account_id: treasuryLedger.id,
        amount: -300000,
        direction: 'debit',
        status: 'settled',
        memo: 'Transferencia interna',
        created_at: new Date('2026-03-15T11:20:00Z'),
      },
    ],
  });

  const portfolio = await prisma.portfolio.create({
    data: {
      organization_id: organization.id,
      name: 'Executive Growth',
      benchmark: '60/40 Global Growth',
      total_value: 12450000,
      cash_pct: 18.5,
      monthly_performance_pct: 2.8,
      risk_band: 'Moderado agresivo',
    },
  });

  await prisma.portfolioPosition.createMany({
    data: [
      {
        portfolio_id: portfolio.id,
        symbol: 'NVDA',
        name: 'NVIDIA',
        weight_pct: 14.2,
        market_value: 1767900,
        pnl_pct: 18.2,
        thesis: 'AI infra leader for asymmetric upside',
      },
      {
        portfolio_id: portfolio.id,
        symbol: 'MSFT',
        name: 'Microsoft',
        weight_pct: 12.9,
        market_value: 1606050,
        pnl_pct: 9.4,
        thesis: 'Core cloud and enterprise compounder',
      },
      {
        portfolio_id: portfolio.id,
        symbol: 'IEF',
        name: 'US 7-10Y Treasury',
        weight_pct: 11.4,
        market_value: 1419300,
        pnl_pct: 1.6,
        thesis: 'Defensive duration pocket for drawdown control',
      },
    ],
  });

  await prisma.orderIntent.create({
    data: {
      organization_id: organization.id,
      portfolio_id: portfolio.id,
      approval_id: approvalIntent.id,
      symbol: 'NVDA',
      side: 'buy',
      amount: 650000,
      rationale: 'Reforzar exposicion AI con guardrail de approval.',
      status: 'pending_approval',
      created_at: new Date('2026-03-16T16:25:00Z'),
    },
  });

  await prisma.brokerConnector.create({
    data: {
      organization_id: organization.id,
      provider: 'tastytrade-demo',
      status: 'sandbox_ready',
      external_account_id: 'demo-wealth-001',
      capabilities: 'summary,positions,intents',
    },
  });

  await prisma.channelWhatsapp.create({
    data: {
      organization_id: organization.id,
      phone_number: '+5215550102030',
      status: 'active',
      webhook_status: 'verified',
      template_namespace: 'tpc_vip',
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      organization_id: organization.id,
      user_id: user.id,
      channel: 'whatsapp',
      owner: 'Rick Salinas',
      predominant_agent: 'Mr. Shark',
    },
  });

  const message = await prisma.message.create({
    data: {
      conversation_id: conversation.id,
      actor: 'user',
      direction: 'inbound',
      raw_payload: '{"channel":"whatsapp"}',
      normalized_text: 'Necesito ver mi liquidez actual',
      intent: 'liquidity_check',
      created_at: new Date('2026-03-16T15:28:00Z'),
    },
  });

  await prisma.agentMemory.createMany({
    data: [
      {
        organization_id: organization.id,
        user_id: user.id,
        fact_type: 'communication_preference',
        content: 'Prefiere respuestas cortas con monto y siguiente paso.',
        confidence: 0.96,
        source_message_id: message.id,
      },
      {
        organization_id: organization.id,
        user_id: user.id,
        fact_type: 'risk_guardrail',
        content: 'Montos altos requieren aprobacion expresa.',
        confidence: 0.98,
        source_message_id: message.id,
      },
      {
        organization_id: organization.id,
        user_id: user.id,
        fact_type: 'portfolio_context',
        content: 'Riesgo moderado agresivo con guardrails de liquidez.',
        confidence: 0.92,
        source_message_id: message.id,
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        organization_id: organization.id,
        owner_id: user.id,
        title: 'Confirmar KYC sponsor IFPE',
        lane: 'Compliance',
        status: 'blocked',
        due_at: new Date('2026-03-19T18:00:00Z'),
      },
      {
        organization_id: organization.id,
        owner_id: user.id,
        title: 'Preparar template VIP de liquidez por WhatsApp',
        lane: 'Engagement',
        status: 'in_progress',
        due_at: new Date('2026-03-18T20:00:00Z'),
      },
      {
        organization_id: organization.id,
        owner_id: user.id,
        title: 'QA del flujo transferencia -> approval -> audit',
        lane: 'Quality',
        status: 'in_progress',
        due_at: new Date('2026-03-18T23:30:00Z'),
      },
    ],
  });

  await prisma.reminder.createMany({
    data: [
      {
        organization_id: organization.id,
        title: 'Aprobar pago proveedor antes de 21:00',
        channel: 'WhatsApp',
        status: 'scheduled',
        due_at: new Date('2026-03-17T21:00:00Z'),
      },
      {
        organization_id: organization.id,
        title: 'Revisar recomendacion de rebalanceo',
        channel: 'Dashboard',
        status: 'scheduled',
        due_at: new Date('2026-03-18T14:00:00Z'),
      },
    ],
  });

  await prisma.workflowRun.createMany({
    data: [
      {
        organization_id: organization.id,
        owner_id: user.id,
        name: 'Transfer > threshold > approval',
        state: 'running',
      },
      {
        organization_id: organization.id,
        owner_id: user.id,
        name: 'WhatsApp liquidity concierge',
        state: 'ready',
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        organization_id: organization.id,
        entity_type: 'transfer',
        entity_id: approvalTransfer.id,
        label: 'transfer.requested',
        summary: 'Se solicito transferencia con politica de aprobacion activa',
      },
      {
        organization_id: organization.id,
        entity_type: 'approval',
        entity_id: approvalIntent.id,
        label: 'approval.escalated',
        summary: 'La recomendacion de inversion supero umbral y fue escalada',
      },
    ],
  });

  await prisma.providerWebhook.create({
    data: {
      organization_id: organization.id,
      provider: 'whatsapp',
      event_type: 'messages',
      payload: '{"status":"received"}',
      processing_status: 'processed',
    },
  });

  await prisma.integrationOutbox.create({
    data: {
      organization_id: organization.id,
      topic: 'notifications.whatsapp.template',
      payload: '{"template":"liquidity_summary"}',
      status: 'queued',
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        organization_id: organization.id,
        actor_id: user.id,
        action: 'transfer.requested',
        resource_type: 'money_transfer',
        resource_id: approvalTransfer.id,
        channel: 'dashboard',
        summary: 'Se solicito transferencia con politica de aprobacion activa',
        created_at: new Date('2026-03-16T18:42:00Z'),
      },
      {
        organization_id: organization.id,
        actor_id: user.id,
        action: 'approval.escalated',
        resource_type: 'approval',
        resource_id: approvalIntent.id,
        channel: 'whatsapp',
        summary: 'La recomendacion de inversion supero umbral y fue escalada',
        created_at: new Date('2026-03-16T16:25:00Z'),
      },
      {
        organization_id: organization.id,
        actor_id: user.id,
        action: 'wallet.balance.viewed',
        resource_type: 'wallet_account',
        resource_id: operatingAccount.id,
        channel: 'dashboard',
        summary: 'Consulta consolidada de liquidez para decision operativa',
        created_at: new Date('2026-03-16T15:30:00Z'),
      },
    ],
  });

  console.log(`Prisma seed complete. Demo login: rick@tpc.demo / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
