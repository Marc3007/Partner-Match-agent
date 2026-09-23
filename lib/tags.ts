export interface ProblemTag {
  id: string;
  label: string;
  /**
   * Each inner array is a SYNONYM GROUP for one concept the tag covers --
   * any single phrase in the group being present fully satisfies that
   * concept slot. This matters: overlap in lib/matching.ts is scored as
   * (satisfied concept slots / total concept slots), so adding more
   * synonyms to an existing concept improves recall for free, while adding
   * a brand new top-level phrase as its own concept would (correctly)
   * still require a matching input for THAT concept too. Flattening
   * synonyms into one big keyword list instead of grouping them dilutes the
   * score the more synonyms you add -- that was a real bug caught by
   * scripts/regression-test.ts and is why this is grouped, not flat.
   */
  concepts: string[][];
}

export interface TagGroup {
  label: string;
  tags: ProblemTag[];
}

// Canonical problem-tag vocabulary. Each tag carries a small set of concept
// groups used by the lightweight, fully local semantic-match proxy in
// lib/matching.ts -- no embeddings call required for the MVP, and it stays
// a drop-in seam for a real embeddings/Claude classification step later
// (see docs/ARCHITECTURE.md).
export const TAG_GROUPS: TagGroup[] = [
  {
    label: 'Sales & CRM',
    tags: [
      { id: 'sales-pipeline-visibility', label: 'Sales pipeline visibility', concepts: [['sales'], ['pipeline', 'sales tracking', 'deal tracking'], ['visibility'], ['forecast'], ['deals']] },
      { id: 'lead-scoring', label: 'Lead scoring & qualification', concepts: [['lead'], ['scoring', 'prioritize leads', 'rank leads'], ['qualification'], ['mql'], ['sql']] },
      { id: 'sales-forecasting', label: 'Sales forecasting', concepts: [['forecast', 'forecasting', 'predict sales', 'sales prediction'], ['revenue'], ['quota']] },
      { id: 'quote-to-cash', label: 'Quote-to-cash', concepts: [['quote', 'quoting', 'price quote'], ['cpq'], ['contract'], ['invoice'], ['cash']] },
      { id: 'customer-360', label: 'Unified customer view (360)', concepts: [['customer'], ['360'], ['unified', 'unify customer data', 'one customer record'], ['single view']] },
    ],
  },
  {
    label: 'ERP & Finance',
    tags: [
      { id: 'financial-close-automation', label: 'Financial close automation', concepts: [['close', 'financial close', 'month-end close'], ['reconciliation', 'reconcile books'], ['accounting']] },
      { id: 'multi-entity-consolidation', label: 'Multi-entity consolidation', concepts: [['consolidation', 'consolidate subsidiaries'], ['entity'], ['subsidiary'], ['multi-entity', 'multiple legal entities']] },
      { id: 'erp-modernization', label: 'ERP modernization', concepts: [['erp'], ['legacy erp', 'old erp', 'replace erp', 'upgrade erp'], ['modernize'], ['migration']] },
      { id: 'procure-to-pay', label: 'Procure-to-pay', concepts: [['procurement', 'buying process'], ['purchase order'], ['invoice'], ['pay', 'vendor payments']] },
      { id: 'revenue-recognition', label: 'Revenue recognition', concepts: [['revenue'], ['recognition', 'recognize revenue'], ['asc606'], ['compliance']] },
      { id: 'financial-planning-fpna', label: 'Financial planning (FP&A)', concepts: [['planning', 'financial plan'], ['budgeting', 'budget'], ['fp&a'], ['forecast']] },
    ],
  },
  {
    label: 'Customer Experience & Support',
    tags: [
      {
        id: 'customer-service-automation',
        label: 'Customer service automation',
        concepts: [['customer service', 'help desk'], ['support', 'support tickets'], ['ticketing'], ['automation', 'automate support']],
      },
      { id: 'conversational-ai-agents', label: 'Conversational AI agents', concepts: [['chatbot'], ['conversational'], ['ai agent', 'ai assistant for customers'], ['virtual agent', 'bot']] },
      { id: 'omnichannel-support', label: 'Omnichannel support', concepts: [['omnichannel', 'across channels', 'phone chat email'], ['multichannel'], ['channel']] },
      { id: 'contact-center-modernization', label: 'Contact center modernization', concepts: [['contact center', 'modernize call center'], ['call center'], ['ccaas']] },
      { id: 'voice-ivr-automation', label: 'Voice / IVR automation', concepts: [['voice', 'voice automation'], ['ivr', 'phone menu'], ['phone'], ['call routing']] },
      { id: 'customer-self-service', label: 'Customer self-service', concepts: [['self-service', 'deflect tickets'], ['knowledge base', 'help center'], ['faq'], ['portal']] },
    ],
  },
  {
    label: 'Marketing',
    tags: [
      {
        id: 'marketing-personalization',
        label: 'Marketing personalization',
        concepts: [['personalization', 'personalize marketing', 'personalized offers'], ['segmentation', 'segment customers'], ['targeting']],
      },
      { id: 'customer-data-platform', label: 'Customer data platform', concepts: [['cdp'], ['customer data'], ['unify', 'unify customer profiles'], ['identity resolution']] },
      { id: 'campaign-automation', label: 'Campaign automation', concepts: [['campaign'], ['automation', 'marketing automation', 'automate campaigns'], ['email'], ['sms']] },
      {
        id: 'lifecycle-marketing',
        label: 'Lifecycle & retention marketing',
        concepts: [['lifecycle'], ['retention', 'retain customers'], ['churn', 'reduce churn'], ['loyalty', 'loyalty program']],
      },
      { id: 'content-experimentation', label: 'Content experimentation / A-B testing', concepts: [['a/b testing', 'split testing'], ['experimentation', 'test variations'], ['optimization']] },
    ],
  },
  {
    label: 'Cloud & Infrastructure',
    tags: [
      {
        id: 'cloud-migration',
        label: 'Cloud migration',
        concepts: [['cloud migration', 'migrate to cloud', 'move to the cloud'], ['migrate'], ['lift and shift'], ['on-prem']],
      },
      { id: 'elastic-compute-scaling', label: 'Elastic compute scaling', concepts: [['scaling', 'scale up', 'handle traffic spikes'], ['elastic'], ['compute'], ['workload']] },
      { id: 'multi-cloud-strategy', label: 'Multi-cloud strategy', concepts: [['multi-cloud'], ['hybrid cloud'], ['vendor lock-in', 'avoid lock-in']] },
      {
        id: 'cost-optimization-finops',
        label: 'Cloud cost optimization (FinOps)',
        concepts: [['cost', 'reduce cloud cost', 'lower cloud bill'], ['finops'], ['cloud spend'], ['optimization']],
      },
      { id: 'disaster-recovery', label: 'Disaster recovery / resilience', concepts: [['disaster recovery'], ['resilience', 'business continuity'], ['backup'], ['uptime'], ['failover']] },
    ],
  },
  {
    label: 'Data & Analytics',
    tags: [
      {
        id: 'data-warehouse-modernization',
        label: 'Data warehouse modernization',
        concepts: [['data warehouse', 'modernize data warehouse', 'replace data warehouse'], ['lakehouse'], ['legacy data']],
      },
      {
        id: 'unified-data-platform',
        label: 'Unified data platform',
        concepts: [['unified data', 'centralize data', 'consolidate data sources'], ['single source of truth'], ['data platform']],
      },
      { id: 'self-service-bi', label: 'Self-service BI', concepts: [['bi', 'business intelligence'], ['dashboard'], ['reporting', 'build reports'], ['self-service']] },
      { id: 'predictive-analytics', label: 'Predictive analytics', concepts: [['predictive', 'predict outcomes', 'predictive model'], ['forecasting model'], ['machine learning']] },
      { id: 'real-time-analytics', label: 'Real-time analytics', concepts: [['real-time', 'real time dashboard'], ['streaming', 'streaming data'], ['live data']] },
    ],
  },
  {
    label: 'Cybersecurity',
    tags: [
      {
        id: 'endpoint-detection-response',
        label: 'Endpoint detection & response',
        concepts: [['endpoint', 'device security', 'laptop security', 'employee laptops', 'compromised', 'hacked', 'breached'], ['edr'], ['malware'], ['ransomware']],
      },
      { id: 'zero-trust-network-access', label: 'Zero trust network access', concepts: [['zero trust'], ['ztna'], ['vpn'], ['network access', 'secure remote access']] },
      { id: 'cloud-security-posture', label: 'Cloud security posture', concepts: [['cloud security', 'secure cloud environment'], ['cspm'], ['misconfiguration']] },
      {
        id: 'identity-access-management',
        label: 'Identity & access management',
        concepts: [['identity', 'iam'], ['sso', 'single sign-on'], ['access management', 'manage user access']],
      },
      {
        id: 'soc-modernization',
        label: 'SOC modernization',
        concepts: [['soc'], ['siem'], ['security operations', 'security monitoring'], ['threat detection', 'detect threats']],
      },
    ],
  },
  {
    label: 'HR & Workforce',
    tags: [
      {
        id: 'employee-onboarding-automation',
        label: 'Employee onboarding automation',
        concepts: [['onboarding', 'onboard employees', 'new employee setup', 'new employees', 'first day', 'day one'], ['new hire'], ['employee lifecycle']],
      },
      { id: 'payroll-modernization', label: 'Payroll modernization', concepts: [['payroll', 'run payroll', 'pay employees'], ['compensation'], ['pay']] },
      { id: 'workforce-planning', label: 'Workforce planning', concepts: [['workforce planning', 'plan headcount'], ['headcount'], ['staffing', 'staffing levels']] },
      { id: 'talent-management', label: 'Talent management', concepts: [['talent', 'manage talent'], ['performance review', 'employee performance'], ['succession']] },
      { id: 'hr-service-delivery', label: 'HR service delivery', concepts: [['hr service', 'hr requests', 'hr questions'], ['employee self-service'], ['hr helpdesk']] },
    ],
  },
  {
    label: 'Supply Chain & Procurement',
    tags: [
      {
        id: 'supply-chain-visibility',
        label: 'Supply chain visibility',
        concepts: [['supply chain'], ['visibility'], ['tracking', 'track shipments', 'supply chain tracking', 'shipments', 'arrive on time', 'where are my shipments']],
      },
      { id: 'demand-planning', label: 'Demand planning', concepts: [['demand planning', 'forecast demand'], ['forecast'], ['inventory', 'inventory planning']] },
      {
        id: 'procurement-automation',
        label: 'Procurement automation',
        concepts: [['procurement', 'automate purchasing', 'buying automation'], ['sourcing'], ['purchase order']],
      },
      {
        id: 'logistics-optimization',
        label: 'Logistics optimization',
        concepts: [['logistics'], ['freight'], ['shipping', 'shipping routes'], ['routing', 'optimize delivery']],
      },
      {
        id: 'supplier-risk-management',
        label: 'Supplier risk management',
        concepts: [['supplier risk', 'supplier reliability'], ['vendor risk', 'vendor disruption'], ['resilience']],
      },
    ],
  },
  {
    label: 'Collaboration & Productivity',
    tags: [
      {
        id: 'hybrid-work-enablement',
        label: 'Hybrid work enablement',
        concepts: [['hybrid work'], ['remote work', 'work from home'], ['workplace'], ['distributed team', 'scattered team', 'time zones', 'work together remotely']],
      },
      { id: 'enterprise-search-knowledge', label: 'Enterprise search & knowledge', concepts: [['knowledge base', 'internal knowledge'], ['enterprise search', 'find information'], ['wiki']] },
      {
        id: 'project-portfolio-management',
        label: 'Project & portfolio management',
        concepts: [['project management', 'manage projects', 'track projects'], ['portfolio'], ['roadmap']],
      },
      { id: 'async-collaboration', label: 'Async collaboration', concepts: [['async'], ['messaging', 'team chat', 'internal messaging'], ['collaboration']] },
      {
        id: 'document-collaboration',
        label: 'Document collaboration',
        concepts: [['document', 'shared documents'], ['co-authoring', 'edit documents together'], ['office']],
      },
    ],
  },
  {
    label: 'ITSM & Automation',
    tags: [
      { id: 'it-service-management', label: 'IT service management', concepts: [['itsm'], ['service desk'], ['it operations', 'it support', 'it requests']] },
      { id: 'itsm-incident-management', label: 'Incident management', concepts: [['incident', 'incident response'], ['outage', 'system outage'], ['on-call']] },
      { id: 'employee-service-portal', label: 'Employee service portal', concepts: [['service portal'], ['self-service portal'], ['employee portal']] },
      {
        id: 'workflow-automation',
        label: 'Workflow automation',
        concepts: [['workflow'], ['automation', 'automate workflows', 'automate processes', 'business process automation'], ['no-code automation']],
      },
      {
        id: 'robotic-process-automation',
        label: 'Robotic process automation (RPA)',
        concepts: [['rpa', 'robotic process'], ['bot', 'software robot'], ['automate repetitive tasks']],
      },
    ],
  },
  {
    label: 'AI & Agentic Platforms',
    tags: [
      { id: 'generative-ai-agents', label: 'Generative AI agents', concepts: [['generative ai', 'genai'], ['agent', 'ai agent', 'build an ai agent'], ['llm']] },
      {
        id: 'enterprise-copilot',
        label: 'Enterprise copilot',
        concepts: [['copilot'], ['assistant', 'ai assistant', 'writing assistant'], ['productivity ai', 'draft emails']],
      },
      { id: 'llm-foundation-model', label: 'LLM foundation models', concepts: [['llm', 'language model', 'large language model'], ['foundation model']] },
      { id: 'retrieval-augmented-generation', label: 'Retrieval-augmented generation (RAG)', concepts: [['rag'], ['retrieval'], ['knowledge grounding', 'answer from our documents']] },
      { id: 'ai-model-customization', label: 'Model fine-tuning / customization', concepts: [['fine-tune', 'customize a model'], ['custom model'], ['training data', 'train a model']] },
      {
        id: 'agentic-workflow-orchestration',
        label: 'Agentic workflow orchestration',
        concepts: [['agentic'], ['orchestration'], ['multi-agent'], ['workflow', 'automate tasks with ai', 'summarize calls']],
      },
    ],
  },
  {
    label: 'E-Commerce',
    tags: [
      { id: 'b2c-commerce-platform', label: 'B2C commerce platform', concepts: [['b2c'], ['online store', 'online shop', 'sell online'], ['storefront'], ['ecommerce']] },
      { id: 'b2b-commerce-platform', label: 'B2B commerce platform', concepts: [['b2b commerce'], ['wholesale'], ['ordering portal', 'business ordering']] },
      {
        id: 'headless-commerce',
        label: 'Headless / composable commerce',
        concepts: [['headless commerce', 'headless storefront', 'decoupled storefront'], ['composable'], ['api-first commerce']],
      },
      {
        id: 'checkout-optimization',
        label: 'Checkout optimization',
        concepts: [['checkout', 'improve checkout'], ['cart abandonment', 'abandoned cart'], ['conversion']],
      },
      { id: 'composable-commerce', label: 'Composable commerce architecture', concepts: [['composable'], ['mach'], ['microservices commerce']] },
    ],
  },
  {
    label: 'Integration & Low-Code',
    tags: [
      {
        id: 'application-integration',
        label: 'Application integration',
        concepts: [['integration'], ['ipaas'], ['connect systems', 'connect our systems', 'connect apps', 'sync systems']],
      },
      { id: 'citizen-development', label: 'Citizen development / low-code apps', concepts: [['low-code'], ['no-code'], ['citizen developer', 'build apps without code']] },
      { id: 'api-management', label: 'API management', concepts: [['api'], ['api gateway'], ['api management', 'manage apis', 'expose apis']] },
      { id: 'workflow-orchestration', label: 'Workflow orchestration', concepts: [['orchestration', 'orchestrate processes'], ['workflow'], ['automation pipeline']] },
      {
        id: 'legacy-system-integration',
        label: 'Legacy system integration',
        concepts: [['legacy system', 'legacy software', 'connect old systems'], ['mainframe'], ['modernize integration']],
      },
    ],
  },
  {
    label: 'Legal, Compliance & GRC',
    tags: [
      {
        id: 'regulatory-compliance-automation',
        label: 'Regulatory compliance automation',
        concepts: [['compliance', 'stay compliant', 'regulatory requirements'], ['regulation'], ['gdpr'], ['soc2']],
      },
      { id: 'contract-lifecycle-management', label: 'Contract lifecycle management', concepts: [['contract', 'manage contracts', 'contract review'], ['clm'], ['e-signature']] },
      { id: 'privacy-management', label: 'Privacy management', concepts: [['privacy', 'data privacy'], ['data subject'], ['consent'], ['privacy requests']] },
      { id: 'risk-management', label: 'Risk management', concepts: [['risk', 'manage risk', 'assess risk'], ['grc'], ['risk register']] },
      {
        id: 'audit-readiness',
        label: 'Audit readiness',
        concepts: [['audit', 'pass an audit'], ['soc 2'], ['iso 27001'], ['certification', 'get certified']],
      },
    ],
  },
  {
    label: 'Sustainability & ESG',
    tags: [
      { id: 'esg-reporting-automation', label: 'ESG reporting automation', concepts: [['esg', 'esg reporting'], ['sustainability report', 'sustainability disclosures'], ['csrd']] },
      { id: 'carbon-accounting', label: 'Carbon accounting', concepts: [['carbon', 'carbon footprint'], ['emissions', 'track emissions'], ['scope 1 2 3']] },
      { id: 'sustainability-disclosure', label: 'Sustainability disclosure', concepts: [['disclosure'], ['sustainability'], ['regulatory reporting']] },
      {
        id: 'supply-chain-emissions-tracking',
        label: 'Supply chain emissions tracking',
        concepts: [['supply chain emissions', 'supplier emissions'], ['scope 3'], ['supplier data']],
      },
    ],
  },
  {
    label: 'Content & Digital Experience',
    tags: [
      {
        id: 'digital-experience-platform',
        label: 'Digital experience platform',
        concepts: [
          ['dxp', 'digital experience'],
          ['website platform', 'manage our website', 'rebuild our website', 'rebuild website', 'redesign our website', 'revamp our website', 'new website'],
        ],
      },
      {
        id: 'headless-cms',
        label: 'Headless CMS',
        concepts: [['headless cms', 'headless website', 'headless site'], ['content api', 'jamstack', 'content management']],
      },
      { id: 'content-personalization', label: 'Content personalization', concepts: [['content personalization', 'personalize content'], ['targeting']] },
      {
        id: 'multichannel-publishing',
        label: 'Multichannel publishing',
        concepts: [['multichannel'], ['omnichannel content'], ['publishing', 'publish content everywhere']],
      },
    ],
  },
  {
    label: 'Master Data & Governance',
    tags: [
      {
        id: 'master-data-management',
        label: 'Master data management',
        concepts: [
          ['master data'],
          ['mdm'],
          ['golden record', 'single source of truth', 'one version of the truth'],
          ['unify our data', 'unify customer records', 'consolidate records'],
          ['duplicate customer data'],
        ],
      },
      {
        id: 'data-quality-governance',
        label: 'Data quality & governance',
        concepts: [
          [
            'data quality', 'clean data', 'clean our data', 'data cleaning', 'data cleanup', 'data cleansing',
            'cleanse data', 'scrub data', 'dirty data', 'messy data', 'bad data', 'data hygiene', 'fix our data',
            'data accuracy', 'incomplete data', 'inconsistent data',
          ],
          ['governance', 'stewardship'],
        ],
      },
      { id: 'data-cataloging', label: 'Data cataloging', concepts: [['data catalog', 'catalog our data'], ['metadata'], ['lineage'], ['data inventory', 'find our data']] },
      {
        id: 'customer-data-deduplication',
        label: 'Customer data deduplication',
        concepts: [['deduplication', 'remove duplicates', 'merge duplicate records'], ['duplicate records', 'duplicate customers'], ['matching']],
      },
    ],
  },
  {
    label: 'Payments & Fintech',
    tags: [
      { id: 'payment-processing', label: 'Payment processing', concepts: [['payment', 'accept payments', 'process payments'], ['checkout'], ['processing']] },
      { id: 'cross-border-payments', label: 'Cross-border payments', concepts: [['cross-border'], ['international payment', 'pay international suppliers'], ['fx', 'currency conversion']] },
      {
        id: 'recurring-billing',
        label: 'Recurring billing / subscriptions',
        concepts: [['subscription', 'subscription billing'], ['recurring billing', 'recurring payments'], ['invoicing']],
      },
      { id: 'embedded-finance', label: 'Embedded finance', concepts: [['embedded finance'], ['banking as a service']] },
      { id: 'fraud-prevention', label: 'Fraud prevention', concepts: [['fraud', 'detect fraud', 'prevent fraud'], ['chargeback'], ['risk scoring']] },
    ],
  },
  {
    label: 'Manufacturing & IoT',
    tags: [
      {
        id: 'industrial-iot-monitoring',
        label: 'Industrial IoT monitoring',
        concepts: [['iot', 'connected sensors'], ['sensor'], ['monitoring', 'monitor equipment'], ['industrial']],
      },
      {
        id: 'predictive-maintenance',
        label: 'Predictive maintenance',
        concepts: [
          ['predictive maintenance', 'prevent breakdowns', 'breaking down', 'breaks down', 'machines breaking down', 'without warning'],
          ['downtime'],
          ['asset health'],
          ['equipment failure'],
        ],
      },
      { id: 'manufacturing-execution-system', label: 'Manufacturing execution system (MES)', concepts: [['mes'], ['manufacturing execution'], ['shop floor'], ['production tracking']] },
      { id: 'digital-twin', label: 'Digital twin', concepts: [['digital twin'], ['simulation', 'simulate our factory', '3d simulation'], ['virtual model']] },
      { id: 'plant-floor-automation', label: 'Plant floor automation', concepts: [['plant floor', 'factory floor', 'factory automation'], ['automation'], ['plc'], ['scada']] },
    ],
  },
  {
    label: 'Product Configuration & Visualization',
    tags: [
      {
        id: 'product-configuration',
        label: 'Product configuration (CPQ)',
        concepts: [
          ['configurator', 'configurators', 'product configurator', 'car configurator', 'car configurators', 'build a configurator', 'configure products'],
          ['cpq'],
          ['guided selling'],
          ['customizable products', 'customization options', 'configurable products'],
        ],
      },
      {
        id: '3d-product-visualization',
        label: '3D product visualization',
        concepts: [
          ['3d visualization', 'visualize products', 'visualize', 'product visualization', '3d visualizer'],
          ['3d rendering', 'render products'],
          ['digital showroom', 'virtual showroom'],
        ],
      },
    ],
  },
];

export const ALL_TAGS: ProblemTag[] = TAG_GROUPS.flatMap((g) => g.tags);
export const TAG_BY_ID: Record<string, ProblemTag> = Object.fromEntries(ALL_TAGS.map((t) => [t.id, t]));
