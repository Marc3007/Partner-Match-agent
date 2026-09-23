/**
 * Regression suite for the semantic-match proxy in lib/matching.ts.
 *
 * Every query below deliberately AVOIDS the literal tag keywords (no "data
 * quality", no "governance", no "onboarding") and instead paraphrases the
 * problem the way a real user would type it. This exists because the
 * matcher does local word-presence matching, not true semantic
 * understanding (see docs/ARCHITECTURE.md) -- these cases catch the failure
 * mode where a real, covered problem returns zero results just because the
 * user didn't happen to use the tag's own wording.
 *
 * Run with: npm run test:matching
 */
import { runMatch } from '../lib/matching';
import type { CompanySize, ComplexityLevel, MatchRequest } from '../lib/types';

interface Case {
  name: string;
  problem: string;
  companySize?: CompanySize;
  complexityTolerance?: ComplexityLevel;
  /** Pass if ANY of these vendor names appear in top or alternatives. */
  expectAnyOf: string[];
}

const CASES: Case[] = [
  {
    name: 'clean our data (the reported bug -- no "quality"/"governance")',
    problem: 'We need to clean our data, it is a mess and full of duplicates.',
    expectAnyOf: ['Informatica', 'Collibra', 'Talend', 'IBM InfoSphere', 'Ataccama', 'Profisee'],
  },
  {
    name: 'pipeline visibility, paraphrased',
    problem: "Our reps can't see where deals stand and forecasts are always wrong.",
    expectAnyOf: ['Salesforce', 'Microsoft Dynamics 365', 'HubSpot', 'Zoho', 'Pipedrive'],
  },
  {
    name: 'repetitive support questions, paraphrased',
    problem: 'Customers keep asking the same questions over and over, we need a bot to handle it.',
    expectAnyOf: ['Zendesk', 'Cognigy', 'Five9', 'Salesforce Service Cloud', 'Genesys', 'NICE'],
  },
  {
    name: 'cloud migration, paraphrased',
    problem: 'We want to move our servers out of our own data center and into the cloud.',
    expectAnyOf: ['AWS', 'Microsoft Azure', 'Google Cloud', 'IBM Cloud'],
  },
  {
    name: 'financial close, paraphrased',
    problem: 'Finance takes forever to close the books every single month across our subsidiaries.',
    expectAnyOf: ['SAP', 'Oracle NetSuite', 'Microsoft Dynamics 365 F&O', 'Sage Intacct'],
  },
  {
    name: 'endpoint security, paraphrased',
    problem: 'We keep getting compromised through employee laptops and need better protection.',
    expectAnyOf: ['CrowdStrike', 'SentinelOne'],
  },
  {
    name: 'onboarding, paraphrased',
    problem: "New employees don't know what to do or who to ask on their first day.",
    expectAnyOf: ['BambooHR', 'Personio', 'Workday', 'Oracle HCM'],
  },
  {
    name: 'supply chain visibility, paraphrased',
    problem: "We can't tell if our shipments will arrive on time or where they even are.",
    expectAnyOf: ['Flexport', 'Blue Yonder', 'Kinaxis', 'Coupa', 'SAP Ariba'],
  },
  {
    name: 'distributed team collaboration, paraphrased',
    problem: "Our team is scattered across time zones and struggles to work together.",
    expectAnyOf: ['Slack', 'Microsoft 365', 'Notion', 'Google Workspace', 'Atlassian'],
  },
  {
    name: 'IT ticket chaos, paraphrased',
    problem: 'IT requests pile up and nobody knows who is handling what.',
    expectAnyOf: ['ServiceNow', 'Freshservice', 'Ivanti', 'BMC Helix'],
  },
  {
    name: 'email drafting copilot, paraphrased',
    problem: 'We want an AI helper that drafts email replies and summarizes calls for our reps.',
    expectAnyOf: ['Microsoft Copilot Studio', 'OpenAI', 'Anthropic', 'Mistral AI', 'Google DeepMind'],
  },
  {
    name: 'cart abandonment, paraphrased',
    problem: 'Too many people abandon their cart right before finishing a purchase on our online shop.',
    expectAnyOf: ['Shopify Plus', 'BigCommerce', 'Salesforce Commerce Cloud', 'Adobe Commerce', 'commercetools'],
  },
  {
    name: 'duplicate customer records, paraphrased',
    problem: 'We have duplicate customer records everywhere and it is a total mess.',
    expectAnyOf: ['Informatica', 'Collibra', 'Profisee', 'Talend', 'Ataccama', 'Reltio'],
  },
  {
    name: 'audit prep, paraphrased',
    problem: 'We are worried about passing our upcoming security audit and certification.',
    expectAnyOf: ['Vanta', 'Drata', 'OneTrust', 'ServiceNow GRC'],
  },
  {
    name: 'factory downtime, paraphrased',
    problem: 'Machines on our factory floor keep breaking down without warning.',
    expectAnyOf: ['PTC', 'Rockwell Automation', 'Siemens Digital Industries', 'AVEVA', 'Cognite'],
  },
  {
    name: 'understaffed callcenter, one-word compound -- catches "callcenter" not matching the two-word "call center" concept',
    problem: 'Our callcenter has less persons to answer every call, we want to implement an ai bot.',
    expectAnyOf: ['Five9', 'Cognigy', 'Genesys', 'NICE', 'UiPath'],
  },
  {
    name: 'headless website rebuild -- catches "headless" alone pulling in e-commerce instead of DXP/CMS',
    problem: 'We need to rebuild our website from a not agile one, to a headless and very strong looking website.',
    expectAnyOf: ['Sitecore', 'Adobe Experience Manager', 'Contentful', 'Storyblok', 'Contentstack', 'Optimizely CMS', 'Bloomreach', 'Acquia', 'Kentico', 'WordPress VIP'],
  },
];

async function run() {
  let failures = 0;
  let mode: string | null = null;
  for (const c of CASES) {
    const req: MatchRequest = {
      problem: c.problem,
      companySize: c.companySize ?? 'mid_market',
      complexityTolerance: c.complexityTolerance ?? 'medium',
      existingStack: [],
    };
    const result = await runMatch(req);
    mode = result.matchingMode;
    const surfaced = new Set([...result.top, ...result.alternatives].map((r) => r.vendor.name));
    const hit = c.expectAnyOf.find((name) => surfaced.has(name));
    if (hit) {
      console.log(`PASS  ${c.name}  (matched: ${hit})`);
    } else {
      failures++;
      console.log(`FAIL  ${c.name}`);
      console.log(`      problem: "${c.problem}"`);
      console.log(`      expected any of: ${c.expectAnyOf.join(', ')}`);
      console.log(`      got top: ${result.top.map((r) => r.vendor.name).join(', ') || '(none)'}`);
      console.log(`      got alternatives: ${result.alternatives.map((r) => r.vendor.name).join(', ') || '(none)'}`);
    }
  }
  console.log(`\nmatchingMode: ${mode}`);
  console.log(`${CASES.length - failures}/${CASES.length} passed.`);
  if (failures > 0) process.exit(1);
}

run();
