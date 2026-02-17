#!/usr/bin/env ts-node

import { execSync } from 'child_process';

const REPO_OWNER = 'aws-amplify';
const REPO_NAME = 'amplify-category-api';

interface DependabotAlert {
  number: number;
  state: string;
  dependency: {
    package: {
      name: string;
      ecosystem: string;
    };
  };
  security_advisory: {
    severity: string;
    summary: string;
    ghsa_id: string;
  };
  security_vulnerability: {
    vulnerable_version_range: string;
  };
  html_url: string;
}

async function fetchDependabotAlerts(): Promise<DependabotAlert[]> {
  let data: string;

  try {
    data = execSync(`gh api /repos/${REPO_OWNER}/${REPO_NAME}/dependabot/alerts?state=open`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: any) {
    if (error.message?.includes('gh: command not found') || error.status === 127) {
      console.error('GitHub CLI not installed.');
      console.error('\nInstall:');
      console.error('  macOS:   brew install gh');
      console.error('  Windows: winget install GitHub.cli');
      console.error('  Linux:   https://github.com/cli/cli#installation');
      console.error('\nThen run: gh auth login');
      process.exit(1);
    }
    if (error.stderr?.includes('authentication') || error.stderr?.includes('not logged in')) {
      console.error('Not authenticated with GitHub.');
      console.error('Run: gh auth login');
      process.exit(1);
    }
    throw error;
  }

  return JSON.parse(data);
}

async function main() {
  try {
    const alerts = await fetchDependabotAlerts();

    if (alerts.length === 0) {
      console.log('✅ No open Dependabot alerts');
      return;
    }

    console.log(`⚠️  Found ${alerts.length} open Dependabot alert(s):\n`);

    const grouped = alerts.reduce((acc, alert) => {
      const severity = alert.security_advisory.severity;
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(alert);
      return acc;
    }, {} as Record<string, DependabotAlert[]>);

    for (const severity of ['critical', 'high', 'medium', 'low']) {
      const items = grouped[severity];
      if (!items) continue;

      console.log(`\n${severity.toUpperCase()} (${items.length}):`);
      items.forEach((alert) => {
        console.log(`  #${alert.number} - ${alert.dependency.package.name}`);
        console.log(`    ${alert.security_advisory.summary}`);
        console.log(`    Range: ${alert.security_vulnerability.vulnerable_version_range}`);
        console.log(`    ${alert.html_url}\n`);
      });
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
