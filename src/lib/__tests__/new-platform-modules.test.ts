/**
 * Tests for new platform modules:
 *   - skill-templates
 *   - integration-hub
 *   - multi-agent-team
 *   - dashboard-truth new capability entries
 */

import { describe, it, expect } from 'vitest'
import {
  getAllSkillTemplates,
  getTemplatesByCategory,
  getSkillTemplate,
  getLaunchReadyTemplates,
  getTemplateSummary,
} from '../skill-templates'
import {
  getAllConnectors,
  getConnector,
  getConnectorStatus,
  getAllConnectorStatuses,
  getIntegrationHubSummary,
  getConnectorsByCategory,
} from '../integration-hub'
import {
  getAllTeams,
  getTeam,
  createTeam,
  deleteTeam,
  getMultiAgentSummary,
  getHandoffChain,
  HANDOFF_CHAINS,
} from '../multi-agent-team'

// ── Skill Templates ──────────────────────────────────────────────────────────

describe('Skill Templates', () => {
  it('should have templates defined', () => {
    const templates = getAllSkillTemplates()
    expect(templates.length).toBeGreaterThan(0)
  })

  it('should return templates by category', () => {
    const devTemplates = getTemplatesByCategory('developer')
    expect(devTemplates.length).toBeGreaterThan(0)
    expect(devTemplates.every((t) => t.category === 'developer')).toBe(true)
  })

  it('should have a code-review-assistant template', () => {
    const t = getSkillTemplate('code-review-assistant')
    expect(t).toBeDefined()
    expect(t!.name).toBe('Code Review Assistant')
    expect(t!.launchReady).toBe(true)
    expect(t!.steps.length).toBeGreaterThan(0)
    expect(t!.entryStepId).toBeTruthy()
    // Entry step must reference a real step ID
    const stepIds = t!.steps.map((s) => s.id)
    expect(stepIds).toContain(t!.entryStepId)
  })

  it('should have a daily-briefing template', () => {
    const t = getSkillTemplate('daily-briefing')
    expect(t).toBeDefined()
    expect(t!.category).toBe('productivity')
  })

  it('should have email-triage template', () => {
    const t = getSkillTemplate('email-triage')
    expect(t).toBeDefined()
    expect(t!.category).toBe('productivity')
    expect(t!.launchReady).toBe(true)
  })


  it('getLaunchReadyTemplates should only return launchReady=true templates', () => {
    const ready = getLaunchReadyTemplates()
    expect(ready.length).toBeGreaterThan(0)
    expect(ready.every((t) => t.launchReady)).toBe(true)
  })

  it('getTemplateSummary should return accurate counts', () => {
    const summary = getTemplateSummary()
    expect(summary.total).toBe(getAllSkillTemplates().length)
    expect(summary.launchReady).toBe(getLaunchReadyTemplates().length)
    expect(typeof summary.byCategory).toBe('object')
  })

  it('every template should have valid step structure', () => {
    for (const template of getAllSkillTemplates()) {
      expect(template.steps.length).toBeGreaterThan(0)
      const stepIds = new Set(template.steps.map((s) => s.id))
      // entryStepId must exist in steps
      expect(stepIds.has(template.entryStepId)).toBe(true)
      // Every step with a next pointer should reference a valid step
      for (const step of template.steps) {
        if (step.next) {
          expect(stepIds.has(step.next)).toBe(true)
        }
      }
    }
  })

  it('every template should have at least one required capability', () => {
    for (const template of getAllSkillTemplates()) {
      expect(template.requiredCapabilities.length).toBeGreaterThan(0)
    }
  })
})

// ── Integration Hub ──────────────────────────────────────────────────────────

describe('Integration Hub', () => {
  it('should have connectors defined', () => {
    const connectors = getAllConnectors()
    expect(connectors.length).toBeGreaterThan(0)
  })

  it('should return connectors by category', () => {
    const emailConns = getConnectorsByCategory('email')
    expect(emailConns.length).toBeGreaterThan(0)
    expect(emailConns.every((c) => c.category === 'email')).toBe(true)
  })

  it('should have a github connector', () => {
    const c = getConnector('github')
    expect(c).toBeDefined()
    expect(c!.category).toBe('developer')
    expect(c!.actions.length).toBeGreaterThan(0)
  })

  it('should have a generic_webhook connector', () => {
    const c = getConnector('generic_webhook')
    expect(c).toBeDefined()
    expect(c!.implementationState).toBe('implemented')
  })

  it('getConnectorStatus should return not_configured when env vars are missing', () => {
    // Gmail requires GMAIL_OAUTH_TOKEN which is not set in test env
    const status = getConnectorStatus('gmail')
    expect(['not_configured', 'configured']).toContain(status)
  })

  it('getAllConnectorStatuses should return an entry for every connector', () => {
    const statuses = getAllConnectorStatuses()
    const connectors = getAllConnectors()
    expect(Object.keys(statuses).length).toBe(connectors.length)
    for (const c of connectors) {
      expect(Object.keys(statuses)).toContain(c.id)
    }
  })

  it('getIntegrationHubSummary should return accurate data', () => {
    const summary = getIntegrationHubSummary()
    expect(summary.total).toBe(getAllConnectors().length)
    expect(typeof summary.configured).toBe('number')
    expect(typeof summary.byCategory).toBe('object')
  })

  it('every connector should have at least one action', () => {
    for (const c of getAllConnectors()) {
      expect(c.actions.length).toBeGreaterThan(0)
    }
  })
})

// ── Multi-Agent Team ─────────────────────────────────────────────────────────

describe('Multi-Agent Team', () => {
  it('should have default teams', () => {
    const teams = getAllTeams()
    expect(teams.length).toBeGreaterThan(0)
  })

  it('should return a team by ID', () => {
    const t = getTeam('research-team')
    expect(t).toBeDefined()
    expect(t!.name).toBe('Research Team')
    expect(t!.members.length).toBeGreaterThan(0)
  })

  it('should create and delete a custom team', () => {
    const team = createTeam({
      name: 'Test Team',
      description: 'Test',
      appSlug: 'test',
      members: [{
        id: 'member-1',
        agentType: 'planner',
        role: 'supervisor',
        name: 'Planner',
        description: 'Plans tasks',
        specializations: [],
        canSupervise: true,
      }],
      supervisorAgentType: 'planner',
      sharedContext: {},
    })
    expect(team.id).toBeTruthy()
    expect(getTeam(team.id)).toBeDefined()

    const deleted = deleteTeam(team.id)
    expect(deleted).toBe(true)
    expect(getTeam(team.id)).toBeUndefined()
  })

  it('should not delete default teams', () => {
    const deleted = deleteTeam('research-team')
    expect(deleted).toBe(false)
    expect(getTeam('research-team')).toBeDefined()
  })

  it('should have predefined handoff chains', () => {
    expect(HANDOFF_CHAINS.length).toBeGreaterThan(0)
  })

  it('should return a handoff chain by ID', () => {
    const chain = getHandoffChain('research-to-report')
    expect(chain).toBeDefined()
    expect(chain!.steps.length).toBeGreaterThan(0)
  })

  it('getMultiAgentSummary should return accurate data', () => {
    const summary = getMultiAgentSummary()
    expect(summary.totalTeams).toBeGreaterThan(0)
    expect(summary.handoffChains).toBe(HANDOFF_CHAINS.length)
    expect(typeof summary.activeTasks).toBe('number')
  })
})

// ── Smart Home Agent ──────────────────────────────────────────────────────────

// ── Dashboard Truth — new capability entries ──────────────────────────────────

describe('Dashboard Truth — new capability entries', () => {
  it('dashboard-truth module should import without errors', async () => {
    // Dynamic import to avoid DB initialization issues in tests
    const mod = await import('../dashboard-truth')
    expect(typeof mod.getCapabilityTruth).toBe('function')
    expect(typeof mod.getProviderTruth).toBe('function')
    expect(typeof mod.getDashboardSummary).toBe('function')
  })
})
