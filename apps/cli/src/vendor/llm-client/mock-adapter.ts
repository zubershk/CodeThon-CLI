import type { LLMProvider, LLMRequest, LLMResponse } from './interfaces';

const MOCK_RESPONSES: Record<string, string> = {
  roadmap: `
## Roadmap

### Milestone 1: Core Setup (Critical)
- Initialize project with chosen stack
- Set up folder structure
- Configure database and auth
- Set up CI/CD pipeline

### Milestone 2: MVP Features (High)
- Implement core user flows
- Build main UI components
- Add API routes
- Error handling

### Milestone 3: Deployment (High)
- Deploy to production
- Set up custom domain
- SSL and security checks

### Milestone 4: Launch (Medium)
- Write README
- Prepare demo video
- Write launch posts
  `,
  architect: `
## Architecture

### Stack
- **Frontend:** Next.js + TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **Deployment:** Vercel

### Folder Structure
\`\`\`
src/
  app/          # Next.js App Router pages
  components/   # Reusable UI components
  lib/          # Utilities and helpers
  api/          # API route handlers
\`\`\`

### Database Schema
- users (id, email, name, created_at)
- projects (id, user_id, name, description, created_at)

### API Routes
- POST /api/auth/register
- POST /api/auth/login
- GET /api/projects
- POST /api/projects
  `,
  debug: `
## Debug Analysis

### Root Cause
The application is failing because of a missing environment variable (DATABASE_URL) and an unhandled promise rejection in the database connection layer.

### Fixes Required
1. Add DATABASE_URL to .env.local
2. Add error boundary around database connection
3. Fix async error handling in route handler

### Recovery Steps
1. Create .env.local with required variables
2. Install missing dependencies
3. Restart the development server

### Commands to Run
\`\`\`bash
cp .env.example .env.local
npm install
npm run dev
\`\`\`
  `,
  emergency: `
## Emergency Recovery

### Severity: HIGH

### Immediate Actions
1. Rollback to last known working commit
2. Disable the failing feature flag
3. Deploy the stable version immediately

### Fallback Strategy
- Switch to static site generation
- Remove database-dependent features temporarily
- Use mock data for demo

### Critical Fixes
\`\`\`bash
git revert HEAD --no-edit
git push origin main
\`\`\`
  `,
  deploy: `
## Deployment Guide

### Platform: Vercel

### Prerequisites
- [ ] Git repository connected
- [ ] Environment variables configured
- [ ] Build command: npm run build
- [ ] Output directory: dist

### Steps
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Environment Variables Needed
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXT_PUBLIC_SITE_URL
  `,
  readme: `
# Project Name

## Description
A brief description of your hackathon project.

## Tech Stack
- Next.js
- TailwindCSS
- Supabase

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture
[Brief architecture overview]

## Team
- [Your Name]
  `,
  launch: `
## Launch Assets

### LinkedIn Post
Excited to share what we built at [Hackathon Name]! 🚀

After 48 hours of building, we created [Product Name] - a [brief description].

Built with: Next.js, TailwindCSS, Supabase

Check it out: [link]

### Twitter/X Post
Built [Product Name] at [Hackathon]! 🚀

[Brief value prop]

Built with: Next.js + TailwindCSS + Supabase

[link]

### Demo Script
1. Show the landing page
2. Walk through core feature
3. Show the result
  `,
  startup: `
## Startup Blueprint

### ICP (Ideal Customer Profile)
- Early-stage founders
- Indie hackers
- Small business owners

### GTM Strategy
1. Launch on Product Hunt
2. Post in indie hacker communities
3. Content marketing on Twitter/X

### Monetization
- Freemium tier
- Pro tier ($9-19/mo)
- Enterprise custom pricing

### Startup Roadmap
1. Validate with 10 beta users
2. Launch MVP
3. Iterate based on feedback
4. Scale
  `,
  learn: `
## Learning Guide

### Topic: [User's Question]

### Quick Answer
Here's a simple explanation of how this works.

### Step-by-Step
1. First, understand the core concept
2. Set up the necessary tools
3. Follow basic examples
4. Build on top of it

### Resources
- Official documentation
- Tutorial links
- Community resources
  `,
};

export class MockProvider implements LLMProvider {
  name = 'mock';

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const lastMessage = request.messages[request.messages.length - 1]?.content || '';
    const lower = lastMessage.toLowerCase();

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 800));

    let content = MOCK_RESPONSES.general;

    if (lower.includes('roadmap') || lower.includes('milestone')) {
      content = MOCK_RESPONSES.roadmap;
    } else if (lower.includes('architect') || lower.includes('architecture') || lower.includes('stack')) {
      content = MOCK_RESPONSES.architect;
    } else if (lower.includes('debug') || lower.includes('error') || lower.includes('fix')) {
      content = MOCK_RESPONSES.debug;
    } else if (lower.includes('emergency')) {
      content = MOCK_RESPONSES.emergency;
    } else if (lower.includes('deploy') || lower.includes('deployment')) {
      content = MOCK_RESPONSES.deploy;
    } else if (lower.includes('readme')) {
      content = MOCK_RESPONSES.readme;
    } else if (lower.includes('launch')) {
      content = MOCK_RESPONSES.launch;
    } else if (lower.includes('startup')) {
      content = MOCK_RESPONSES.startup;
    } else if (lower.includes('learn') || lower.includes('teach') || lower.includes('how')) {
      content = MOCK_RESPONSES.learn;
    }

    return {
      content,
      usage: {
        promptTokens: 150,
        completionTokens: 200,
        totalTokens: 350,
      },
    };
  }
}
