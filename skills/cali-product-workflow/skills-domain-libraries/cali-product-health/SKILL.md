---
name: cali-product-health
description: >
  [Cali] Health and wellness product strategies. Covers digital therapeutics,
  habit formation, data privacy, and regulatory considerations for health products.

  Trigger keywords: health app, wellness product, habit tracking, digital health,
  fitness app, mental health, health data privacy, regulatory compliance
---

# Product Health

## Goal

Design health and wellness products that are effective, ethical, and compliant — balancing measurable outcomes with user privacy and safety.

## Domain Context

Health products carry unique responsibilities. Key themes:
- **Effectiveness** — Can the product actually deliver health outcomes?
- **Habit Formation** — How to build sustainable health behaviors
- **Data Privacy** — Health data requires extra protection
- **Regulatory Compliance** — FDA, HIPAA, and other regulations

## Product Categories

### Digital Therapeutics (DTx)

Software-based interventions that treat or manage medical conditions.

**Characteristics:**
- Clinically validated outcomes
- Often prescription-only or medical-device classified
- FDA clearance may be required

**Examples:**
- Pear Therapeutics (reSET) for substance abuse
- Akili Interactive (EndeavorRx) for ADHD
- Omada Health for diabetes prevention

**Considerations:**
- Clinical trial requirements
- Medical device classification
- Healthcare provider relationships

### Wellness Apps

Consumer-facing apps for general wellness (diet, exercise, sleep, meditation).

**Characteristics:**
- Not intended to treat medical conditions
- Lower regulatory burden
- Broader market reach

**Examples:**
- MyFitnessPal, Strava, Headspace, Calm

**Considerations:**
- "Wellness" claim boundaries
- GDPR and health data handling
- User safety for extreme recommendations

### Wearables and Sensors

Hardware products that collect biometric data.

**Characteristics:**
- Continuous data collection
- Integration with other products
- Hardware manufacturing complexity

**Examples:**
- Apple Watch, Whoop, Oura Ring,continuous glucose monitors

**Considerations:**
- Sensor accuracy validation
- Battery life and comfort
- Data export and interoperability

### Telehealth

Remote healthcare delivery through video, phone, or messaging.

**Characteristics:**
- Direct provider relationships
- Scheduling and billing complexity
- Geographic licensing requirements

**Considerations:**
- Provider credentialing
- State-by-state licensing
- Insurance reimbursement

## Habit Formation Principles

### BJ Fogg's Behavior Model

**B = MAT** (Motivation, Ability, Prompt)

For behavior change:
- **Motivation**: Users must want to change
- **Ability**: The behavior must be easy to do
- **Prompt**: Something must trigger the action

**Design implications:**
- Simplify the target behavior as much as possible
- Time prompts to when motivation is highest
- Choose habits that match existing routines

### Variable Reward Scheduling

Inspired by slot machine psychology:
- Intermittent, unpredictable rewards increase engagement
- Streak tracking with "surprise" bonuses
- Social comparisons with leaderboards

**Caution:** Can be manipulative — use ethically.

### Identity-Based Habits

Shifting from "I want to run a marathon" to "I am a runner":
- Daily habits that reinforce identity
- Public commitments
- Community belonging

## Data Privacy and Security

### HIPAA Considerations (US)

Protected Health Information (PHI) requires:
- **Administrative safeguards**: Policies, training, risk assessment
- **Physical safeguards**: Facility access, workstation security
- **Technical safeguards**: Encryption, access controls, audit logs

**Key question:** Is your product used by or in connection with covered entities?

### GDPR Considerations (EU)

Health data is "special category" data requiring:
- Explicit consent for processing
- Specific purpose limitation
- Data minimization
- Right to erasure

### De-identification

Techniques to remove personally identifiable information:
- **Safe Harbor**: 18 identifiers removed
- **Expert Determination**: Statistical expert validates re-identification risk

**Caution:** With enough data points, re-identification becomes possible.

### Data Portability

Users should be able to export their data:
- Portability is a GDPR right
- Builds trust and transparency
- Enables user switching costs

## Regulatory Considerations

### FDA Classification

Software as a Medical Device (SaMD):
- **Class I**: Low risk — general controls
- **Class II**: Moderate risk — special controls
- **Class III**: High risk — premarket approval

**FDA Digital Health Innovation:**
- FDA Pre-Cert Program for trusted developers
- Breakthrough Device designation for innovative products

### Claims and Labeling

**Efficacy claims** require evidence:
- "treats" vs. "supports" vs. "may help" — legal implications
- Clinical endpoints vs. surrogate endpoints
- Comparative claims vs. superiority claims

**Health claims (FTC):**
- Substantiation required for health claims
- Competent and reliable scientific evidence
- Expert review for significant claims

### Age-Based Considerations

**COPPA (Children's Online Privacy Protection Act):**
- Under 13 requires parental consent
- Data collection restrictions
- Parental access and deletion rights

**FERPA (Educational Records):**
- School-used products have additional requirements
- Educational institution permissions

## Ethical Considerations

### Mental Health Products

- **Crisis protocols**: What happens when someone reports suicidal ideation?
- **Effectiveness evidence**: Are claims backed by clinical evidence?
- **Dependency risks**: Can the product create unhealthy dependencies?

### Weight Loss Products

- **Realistic expectations**: "Lose 30 lbs in 30 days" is dangerous
- **Eating disorder risk**: Can trigger disordered eating behaviors
- **Genetic essentialism**: Avoid implying weight is purely controllable

### Fitness Trackers

- **Accuracy limitations**: Users may misunderstand sensor accuracy
- **Motivation manipulation**: Step challenges can encourage harmful behavior
- **Body image impacts**: Weight tracking can be triggering

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Health product research, regulatory landscape |
| Phase 2 (Context) | User health context, data requirements |
| Phase 3 (Shape) | Health outcomes in scope |
| Phase 6 (Interface) | Health data UI, consent flows |
| Phase 10 (Planning) | Health feature scopes, compliance |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Health strategy section
- **spec-tech.md** — Health feature scopes
- **interface proposals** — Health data UI designs

## Gotchas

1. **Efficacy evidence** — Don't overstate health benefits without evidence
2. **Data protection** — Health data needs extra safeguards
3. **Regulatory clarity** — Understand your regulatory classification early
4. **Crisis protocols** — Plan for when users report health crises

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-trust-building**: Trust considerations for health data
- **cali-product-privacy**: Privacy compliance frameworks
- **cali-product-marketplace-playbook**: App store health category requirements

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`