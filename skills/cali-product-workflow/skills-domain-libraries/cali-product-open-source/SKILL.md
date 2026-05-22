---
name: cali-product-open-source
description: >
  [Cali] Open source strategies for products. Covers licensing, community building,
  governance, monetization, and sustainability for open source projects.

  Trigger keywords: open source, OSS, licensing, community, governance, sustainability,
  monetization, contribution, maintainer
---

# Product Open Source

## Goal

Build successful open source products that attract contributors, serve users, and achieve long-term sustainability without compromising the open source ethos.

## Domain Context

Open source is both a development model and a product strategy. Key themes:
- **Licensing** — Legal framework for sharing and collaboration
- **Community Building** — Growing and sustaining contributors
- **Governance** — Decision-making and power structures
- **Monetization** — Making open source economically sustainable

## Licensing

### License Categories

**Copyleft (Viral) Licenses:**
- GPL, AGPL, LGPL
- Requires derivative works to be open source
- Forces ecosystem to remain open

**Permissive Licenses:**
- MIT, Apache 2.0, BSD
- Allows proprietary use and derivatives
- Broader adoption, less restrictive

**Choose based on:**
- How you want the ecosystem to develop
- Whether you want to compete with or enable others
- Your monetization strategy

### License Compatibility

Not all licenses work together:
- GPL is incompatible with Apache 2.0
- MIT and Apache are compatible
- AGPL is the most restrictive

### Dual Licensing

Strategy of offering multiple licenses:
- **Open source license** for open use
- **Commercial license** for proprietary use

**Examples:**
- MySQL (GPL free, commercial paid)
- Elastic (Apache free, Elasticsearch paid)
- Redis (BSD free, Redis modules paid)

**Considerations:**
- Clear license switching
- Trademark considerations
- Commercial partner relationships

## Community Building

### Contributor Pipeline

**Awareness → Interest → Participation → Contribution → Leadership**

**Attracting Contributors:**
- Clear, well-documented onboarding
- "Good first issues" for newcomers
- Responsive to initial contributions

**Growing Contributors:**
- Recognition and visibility
- Career benefits of OSS contributions
- Clear paths to greater responsibility

**Retaining Contributors:**
- Maintain work-life balance (don't burn out maintainers)
- Shared ownership and agency
- Regular communication and feedback

### Community Roles

**Users:**
- Feedback, bug reports, feature requests
- Word of mouth promotion
- Potential contributor pipeline

**Contributors:**
- Code contributions (documentation, tests, code)
- Community support (forum answers, code review)
- Translation, localization

**Maintainers:**
- Decision-making authority
- Code review and merge approval
- Community leadership

**Governance Roles:**
- Steering committee
- Special interest groups
- Advisory boards

### Communication Channels

**Synchronous:**
- Real-time chat (Discord, Slack, IRC)
- Video calls
- Virtual and in-person events

**Asynchronous:**
- Mailing lists
- Forums
- GitHub Discussions
- Newsletters

**Documentation:**
- README and getting started
- Contributing guidelines
- Architecture documentation
- API documentation

## Governance

### Governance Models

**BDFL (Benevolent Dictator For Life):**
- Single decision-maker
- Fast decision-making
- Risk: single point of failure

**Meritocracy:**
- Decisions based on contribution
- Formal contribution process
- Risk: can exclude underrepresented groups

**Governance Board:**
- Elected or appointed body
- Balanced decision-making
- More formal structure

**Corporate Stewardship:**
- Single company controls direction
- Commercial interests primary
- May conflict with community

### Decision-Making Processes

**RFC (Request for Comments):**
- Open process for major changes
- Community feedback period
- Documented rationale

**Voting:**
- TSC (Technical Steering Committee) votes
- Community ratification for major decisions
- Supermajority for controversial changes

**Consensus Seeking:**
- Aim for broad agreement
- Formal objection process
- Decision by lazy consensus

### Power Dynamics

**Corporate Power:**
- Companies contribute code and resources
- Can influence direction through contributions
- Risk: corporate capture

**Maintainer Power:**
- Control merge decisions
- Can be abusive or negligent
- Succession planning important

**Contributor Power:**
- Those who do the work have influence
- Key contributor departure can be harmful
- Recognition and retention important

## Monetization

### Open Source Business Models

**Support and Services:**
- Enterprise support contracts
- Consulting services
- Training and certification

**Hosted/SaaS Offering:**
- Free self-hosted version
- Paid hosted version with managed infrastructure
- Example: GitLab, WordPress.com

**Open Core:**
- Core open source, paid features proprietary
- Example: Elastic, Redis, GitLab

**Freemium:**
- Free tier with basic features
- Paid tier with advanced features
- Example: Docker, MongoDB

**Donations and Sponsorship:**
- Open Collective
- GitHub Sponsors
- Corporate sponsors

**Dual Licensing:**
- Open source license free
- Commercial license paid

### Sustainability Challenges

**Maintainer Burnout:**
- Thankless, unrewarded work
- Expectation of free support
- Security and maintenance burden

**Funding Models:**
- Grants (foundations, government)
- Corporate sponsorship
- Individual sponsors

**Commercial Pressure:**
- Pressure to compromise on open source values
- Corporate capture of governance
- Feature prioritization conflicts

### Building Sustainable OSS

**Time Management:**
- Set boundaries clearly
- Automate what can be automated
- Build team, not just project

**Financial Stability:**
- Foundation or company structure
- Multiple funding sources
- Clear business model

**Community Health:**
- Code of conduct
- Conflict resolution
- Diverse contributor base

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Open source strategy, licensing research |
| Phase 2 (Context) | Community landscape, competition |
| Phase 3 (Shape) | Open source scope decisions |
| Phase 6 (Interface) | Open source product UI |
| Phase 10 (Planning) | Open source feature scopes, governance |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Open source strategy section
- **spec-tech.md** — Open source feature scopes
- **interface proposals** — OSS product UI designs

## Gotchas

1. **License first** — Choose license before first release
2. **Community over code** — Sustainable communities outlast projects
3. **Governance early** — Define governance before problems arise
4. **Monetization clarity** — How will the project be sustained?

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-business-models**: Business model context
- **cali-product-trust-building**: Community trust
- **cali-product-promotions**: OSS launch and promotion

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`