import { db } from './db';
import { checkSupabaseConnection, describeSupabaseConfig } from './supabase';
import { describeNimConfig } from './ai';

export type Alert = {
  id: string;
  severity: 'critical' | 'warning';
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
};

/**
 * Monitoring service for TakeMaster
 * Provides metrics, health checks, alerting, and observability capabilities
 */

// Metrics storage (in-memory for simplicity, could be exported to external systems)
const metrics = {
  // Request metrics
  requestsTotal: 0,
  requestsByEndpoint: new Map<string, number>(),
  requestsByMethod: new Map<string, number>(),
  requestsByStatus: new Map<string, number>(),
  requestDurationMs: new Map<string, number[]>(),

  // Business metrics
  programsTotal: 0,
  participantsTotal: 0,
  episodesTotal: 0,
  libraryAssetsTotal: 0,
  agendaEventsTotal: 0,

  // Dependency metrics
  supabaseConnectionStatus: false as boolean | 'unknown',
  supabaseLatencyMs: 0,
  nimPrimaryConfigured: false,
  nimFallbackConfigured: false,

  // System metrics
  workerUptimeMs: 0,
  memoryUsageMb: 0,
  errorCount: 0,
};

// Start time for uptime calculation
const startTime = Date.now();

/**
 * Initialize monitoring service
 * Call this when the worker starts
 */
export function initializeMonitoring() {
  // Set initial worker uptime
  metrics.workerUptimeMs = Date.now() - startTime;
  
  // Perform initial health checks
  updateDependencyMetrics();
  
  console.log('[Monitoring] Monitoring service initialized');
}

/**
 * Update dependency metrics (Supabase, NIM, etc.)
 */
export async function updateDependencyMetrics() {
  try {
    // Check Supabase connection
    const supabaseCfg = describeSupabaseConfig();
    if (supabaseCfg.configured) {
      const dbState = await checkSupabaseConnection();
      metrics.supabaseConnectionStatus = dbState.connected;
      metrics.supabaseLatencyMs = dbState.latencyMs;
    } else {
      metrics.supabaseConnectionStatus = false;
      metrics.supabaseLatencyMs = 0;
    }
  } catch (error) {
    console.warn('[Monitoring] Failed to update Supabase metrics:', error);
    metrics.supabaseConnectionStatus = false;
    metrics.supabaseLatencyMs = 0;
  }

  try {
    // Check NIM configuration
    const nim = describeNimConfig();
    metrics.nimPrimaryConfigured = nim.configured && !!nim.primaryModel;
    metrics.nimFallbackConfigured = nim.configured && !!nim.fallbackModel;
  } catch (error) {
    console.warn('[Monitoring] Failed to update NIM metrics:', error);
    metrics.nimPrimaryConfigured = false;
    metrics.nimFallbackConfigured = false;
  }
}

/**
 * Update business metrics from database
 */
export async function updateBusinessMetrics() {
  try {
    // Get counts for various entities
    const [programs, participants, episodes, libraryAssets, agendaEvents] = await Promise.all([
      db.getPrograms(),
      db.getParticipants(),
      db.getEpisodes(),
      db.getLibraryAssets(),
      db.getAgendaEvents()
    ]);

    metrics.programsTotal = programs.length;
    metrics.participantsTotal = participants.length;
    metrics.episodesTotal = episodes.length;
    metrics.libraryAssetsTotal = libraryAssets.length;
    metrics.agendaEventsTotal = agendaEvents.length;
  } catch (error) {
    console.warn('[Monitoring] Failed to update business metrics:', error);
  }
}

/**
 * Record a request metric
 */
export function recordRequest(endpoint: string, method: string, statusCode: number, durationMs: number) {
  metrics.requestsTotal++;
  
  // Increment endpoint counter
  const endpointCount = (metrics.requestsByEndpoint.get(endpoint) || 0) + 1;
  metrics.requestsByEndpoint.set(endpoint, endpointCount);
  
  // Increment method counter
  const methodCount = (metrics.requestsByMethod.get(method) || 0) + 1;
  metrics.requestsByMethod.set(method, methodCount);
  
  // Increment status counter
  const statusCount = (metrics.requestsByStatus.get(String(statusCode)) || 0) + 1;
  metrics.requestsByStatus.set(String(statusCode), statusCount);
  
  // Record duration
  const durations = metrics.requestDurationMs.get(endpoint) || [];
  durations.push(durationMs);
  // Keep only last 100 durations to prevent memory growth
  if (durations.length > 100) durations.shift();
  metrics.requestDurationMs.set(endpoint, durations);
}

/**
 * Increment error count
 */
export function incrementErrorCount() {
  metrics.errorCount++;
}

/**
 * Get current metrics for export/display
 */
export function getMetrics() {
  return {
    ...metrics,
    // Calculate derived metrics
    workerUptimeMs: Date.now() - startTime,
    requestRatePerSecond: metrics.requestsTotal / Math.max((Date.now() - startTime) / 1000, 1),
    errorRate: metrics.errorCount / Math.max(metrics.requestsTotal, 1),
  };
}

/**
 * Get health status for the worker
 */
export async function getHealthStatus() {
  await updateDependencyMetrics();
  
  const supabaseCfg = describeSupabaseConfig();
  const nim = describeNimConfig();
  
  const isHealthy = 
    supabaseCfg.configured && 
    metrics.supabaseConnectionStatus === true &&
    metrics.nimPrimaryConfigured;

  return {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
    version: '1.0.0',
    dependencies: {
      supabase: {
        configured: supabaseCfg.configured,
        connected: metrics.supabaseConnectionStatus,
        latencyMs: metrics.supabaseLatencyMs,
      },
      nim: {
        configured: nim.configured,
        primaryModel: metrics.nimPrimaryConfigured,
        fallbackModel: metrics.nimFallbackConfigured,
      }
    },
    metrics: getMetrics()
  };
}

/**
 * Check if system is ready to serve traffic
 */
export async function isReady(): Promise<boolean> {
  const health = await getHealthStatus();
  return health.status === 'ok';
}

/**
 * Perform recovery tests
 * This would test various failure scenarios and recovery mechanisms
 */
export async function runRecoveryTests(nimOptions?: { baseUrl?: string; apiKey?: string; primaryModel?: string; timeoutMs?: number }) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{
      name: string;
      passed: boolean;
      durationMs: number;
      error?: string;
    }>,
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  };

  // Test 1: Supabase connectivity
  const supabaseTestStart = Date.now();
  try {
    const supabaseCfg = describeSupabaseConfig();
    if (supabaseCfg.configured) {
      const dbState = await checkSupabaseConnection();
      results.tests.push({
        name: 'supabase-connectivity',
        passed: dbState.connected,
        durationMs: Date.now() - supabaseTestStart,
        error: dbState.connected ? undefined : `Connection failed: ${dbState.error}`
      });
    } else {
      results.tests.push({
        name: 'supabase-connectivity',
        passed: false,
        durationMs: Date.now() - supabaseTestStart,
        error: 'Supabase not configured'
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'supabase-connectivity',
      passed: false,
      durationMs: Date.now() - supabaseTestStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: NIM API accessibility (real request)
  const nimTestStart = Date.now();
  try {
    const nim = describeNimConfig();
    const baseUrl = (nimOptions?.baseUrl || 'https://integrate.api.nvidia.com').replace(/\/$/, '');
    const apiKey = nimOptions?.apiKey || '';
    const primaryModel = nimOptions?.primaryModel || nim.primaryModel || '';
    const timeoutMs = nimOptions?.timeoutMs || 10000;

    if (nim.configured && apiKey && primaryModel) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(baseUrl + '/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: primaryModel,
            messages: [{ role: 'user', content: 'Reply only with OK.' }],
            max_tokens: 1,
            temperature: 0,
          }),
          signal: controller.signal,
        });
        const raw = await response.text();
        results.tests.push({
          name: 'nim-api-accessibility',
          passed: response.ok,
          durationMs: Date.now() - nimTestStart,
          error: response.ok ? undefined : 'NIM HTTP ' + response.status + ': ' + raw.slice(0, 300),
        });
      } finally {
        clearTimeout(timeout);
      }
    } else {
      results.tests.push({
        name: 'nim-api-accessibility',
        passed: false,
        durationMs: Date.now() - nimTestStart,
        error: 'NIM not configured'
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'nim-api-accessibility',
      passed: false,
      durationMs: Date.now() - nimTestStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Database query capability
  const dbTestStart = Date.now();
  try {
    // Try a simple query
    await db.getPrograms();
    results.tests.push({
      name: 'database-query-capability',
      passed: true,
      durationMs: Date.now() - dbTestStart
    });
  } catch (error) {
    results.tests.push({
      name: 'database-query-capability',
      passed: false,
      durationMs: Date.now() - dbTestStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.passed).length;
  results.summary.failed = results.summary.total - results.summary.passed;

  return results;
}

/**
 * Define SLIs/SLOs for the service
 */
export function getSliSloDefinitions() {
  return {
    slis: [
      {
        name: 'request-latency-p95',
        description: '95th percentile of request latency',
        target: 500, // 500ms
        unit: 'ms'
      },
      {
        name: 'availability',
        description: 'Percentage of successful requests',
        target: 99.9, // 99.9%
        unit: '%'
      },
      {
        name: 'dependency-health',
        description: 'Percentage of time dependencies are healthy',
        target: 99.0, // 99%
        unit: '%'
      }
    ],
    slos: [
      {
        name: 'monthly-availability',
        description: 'Monthly availability target',
        target: 99.9, // 99.9% per month
        unit: '%',
        period: '720h' // 30 days
      }
    ]
  };
}

/**
 * Check if alerts should be triggered based on current metrics
 */
export function checkAlertConditions(): Alert[] {
  const alerts = [];
  const metrics = getMetrics();
  
  // Alert: High error rate
  if (metrics.errorRate > 0.05) { // >5% error rate
    alerts.push({
      id: 'high-error-rate',
      severity: 'critical',
      message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      value: metrics.errorRate,
      threshold: 0.05
    });
  }
  
  // Alert: High latency
  const avgLatencyByEndpoint = new Map<string, number>();
  for (const [endpoint, durations] of metrics.requestDurationMs.entries()) {
    if (durations.length > 0) {
      const avg = durations.reduce((sum, val) => sum + val, 0) / durations.length;
      avgLatencyByEndpoint.set(endpoint, avg);
    }
  }
  
  for (const [endpoint, avgLatency] of avgLatencyByEndpoint.entries()) {
    if (avgLatency > 1000) { // >1 second
      alerts.push({
        id: `high-latency-${endpoint}`,
        severity: 'warning',
        message: `High latency on ${endpoint}: ${avgLatency.toFixed(0)}ms`,
        timestamp: new Date().toISOString(),
        value: avgLatency,
        threshold: 1000
      });
    }
  }
  
  // Alert: Dependency down
  if (metrics.supabaseConnectionStatus === false) {
    alerts.push({
      id: 'supabase-down',
      severity: 'critical',
      message: 'Supabase connection is down',
      timestamp: new Date().toISOString(),
      value: metrics.supabaseConnectionStatus ? 1 : 0,
      threshold: 1
    });
  }
  
  if (!metrics.nimPrimaryConfigured) {
    alerts.push({
      id: 'nim-unavailable',
      severity: 'warning',
      message: 'Primary NIM model is not configured',
      timestamp: new Date().toISOString(),
      value: metrics.nimPrimaryConfigured ? 1 : 0,
      threshold: 1
    });
  }
  
  return alerts;
}

/**
 * Deliver active alerts to an operational webhook.
 * Returns false when no webhook is configured or delivery fails.
 */
export async function deliverAlerts(alerts: Alert[], webhookUrl?: string): Promise<{ configured: boolean; delivered: boolean; error?: string }> {
  if (alerts.length === 0) return { configured: !!webhookUrl, delivered: true };
  if (!webhookUrl) return { configured: false, delivered: false, error: 'ALERT_WEBHOOK_URL not configured' };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'takemaster',
        timestamp: new Date().toISOString(),
        alerts,
      }),
    });
    if (!response.ok) {
      return { configured: true, delivered: false, error: 'Alert webhook HTTP ' + response.status };
    }
    return { configured: true, delivered: true };
  } catch (error) {
    return { configured: true, delivered: false, error: error instanceof Error ? error.message : String(error) };
  }
}
