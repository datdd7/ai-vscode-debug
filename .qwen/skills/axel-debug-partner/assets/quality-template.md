# Quality Report Template

**Purpose:** Standard template for Axel quality reports

---

# Axel Quality Report

**Report ID:** QR-YYYYMMDD-NNN
**Date:** YYYY-MM-DD HH:MM:SS
**Agent Version:** 1.0.0
**Scanner Version:** 1.0.0
**Review Type:** [Initial | Monthly | Pre-Release]

---

## 📊 Executive Summary

**Overall Quality Score:** XX/100

**Status:** ✅ Pass / ⚠️ Conditional / ❌ Fail

| Quality Dimension | Score | Status | Trend |
|-------------------|-------|--------|-------|
| Structure Compliance | XX/100 | ✅/⚠️/❌ | ↑/→/↓ |
| Prompt Craft | XX/100 | ✅/⚠️/❌ | ↑/→/↓ |
| Execution Efficiency | XX/100 | ✅/⚠️/❌ | ↑/→/↓ |
| Enhancement Opportunities | XX/100 | ✅/⚠️/❌ | ↑/→/↓ |

**Summary:**
[2-3 sentence summary of overall quality status]

---

## 📁 Structure Compliance

### File Inventory

| File | Status | Completeness | Notes |
|------|--------|--------------|-------|
| SKILL.md | ✅ | 100% | Complete |
| build-process.md | ✅ | 100% | Complete |
| quality-optimizer.md | ✅ | 100% | Complete |
| prompts/system-prompt.md | ✅ | 100% | Complete |
| prompts/debug-strategy.md | ✅ | 100% | Complete |
| prompts/bug-patterns.md | ✅ | 100% | Complete |
| prompts/interaction.md | ⚠️ | 80% | Missing examples |
| capabilities/cli-client.md | ✅ | 100% | Complete |
| capabilities/http-client.md | ✅ | 100% | Complete |
| capabilities/session-manager.md | ✅ | 100% | Complete |
| memory/session-history.md | ✅ | 100% | Complete |

### Section Completeness

**SKILL.md:**
- [✅] Vision section
- [✅] Memory System section
- [✅] Capabilities section
- [✅] Autonomous Modes section
- [✅] Interaction Style section
- [✅] File Structure section
- [✅] Quality Dimensions section
- [✅] Activation section
- [✅] Traceability section

**Issues Found:**
```
1. [Issue ID] Missing file: [filename]
   - Severity: [Critical/Major/Minor]
   - Impact: [Description]
   - Recommendation: Create file with [content]
```

**Score:** XX/100

---

## 📝 Prompt Craft

### System Prompt Evaluation

| Criteria | Score | Notes |
|----------|-------|-------|
| Persona Clarity | XX/100 | [Notes] |
| Knowledge Base | XX/100 | [Notes] |
| Decision Logic | XX/100 | [Notes] |
| Communication Style | XX/100 | [Notes] |
| Examples Quality | XX/100 | [Notes] |

### Debug Strategy Evaluation

| Criteria | Score | Notes |
|----------|-------|-------|
| Decision Flows | XX/100 | [Notes] |
| When-to-X Rules | XX/100 | [Notes] |
| Bug Pattern Trees | XX/100 | [Notes] |
| Session Restore | XX/100 | [Notes] |

### Bug Patterns Evaluation

| Criteria | Score | Notes |
|----------|-------|-------|
| Coverage | XX/100 | [Number of patterns] |
| Detail Level | XX/100 | [Notes] |
| Examples | XX/100 | [Notes] |
| Detection Strategies | XX/100 | [Notes] |
| Fix Patterns | XX/100 | [Notes] |

**Issues Found:**
```
1. [Issue ID] Unclear prompt in [section]
   - Severity: [Critical/Major/Minor]
   - Impact: [Description]
   - Recommendation: Rewrite to [suggestion]
```

**Score:** XX/100

---

## ⚡ Execution Efficiency

### Performance Metrics

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| CLI Launch | <100ms | XXms | ✅/❌ |
| CLI Breakpoint | <100ms | XXms | ✅/❌ |
| CLI Evaluate | <100ms | XXms | ✅/❌ |
| HTTP Symbols | <500ms | XXms | ✅/❌ |
| HTTP References | <500ms | XXms | ✅/❌ |
| Session Restore | <1s | XXms | ✅/❌ |
| State Save | <100ms | XXms | ✅/❌ |

### Resource Usage

| Resource | Target | Actual | Status |
|----------|--------|--------|--------|
| State File Size | <100KB | XXKB | ✅/❌ |
| Position History | <50 entries | XX | ✅/❌ |
| Variable Snapshots | <100 | XX | ✅/❌ |
| Memory Limit | <10MB | XXMB | ✅/❌ |

### Error Handling

| Scenario | Handled? | Recovery | Notes |
|----------|----------|----------|-------|
| Proxy Not Running | ✅/❌ | [Description] | [Notes] |
| Network Timeout | ✅/❌ | [Description] | [Notes] |
| Invalid Response | ✅/❌ | [Description] | [Notes] |
| Session Lost | ✅/❌ | [Description] | [Notes] |

**Issues Found:**
```
1. [Issue ID] Performance bottleneck in [operation]
   - Severity: [Critical/Major/Minor]
   - Impact: [Description]
   - Recommendation: Optimize by [suggestion]
```

**Score:** XX/100

---

## 🚀 Enhancement Opportunities

### High Priority

| ID | Opportunity | Benefit | Effort | Priority Score |
|----|-------------|---------|--------|----------------|
| E-001 | [Description] | High | Medium | 9/10 |
| E-002 | [Description] | High | Low | 10/10 |

### Medium Priority

| ID | Opportunity | Benefit | Effort | Priority Score |
|----|-------------|---------|--------|----------------|
| E-003 | [Description] | Medium | Low | 7/10 |
| E-004 | [Description] | Medium | Medium | 6/10 |

### Low Priority

| ID | Opportunity | Benefit | Effort | Priority Score |
|----|-------------|---------|--------|----------------|
| E-005 | [Description] | Low | High | 3/10 |

**Score:** XX/100 (based on number of high-priority opportunities identified and addressed)

---

## 🎯 Critical Issues

### Must Fix (Blockers)

| ID | Issue | Impact | Recommendation | ETA |
|----|-------|--------|----------------|-----|
| C-001 | [Description] | [Description] | [Fix] | [Date] |
| C-002 | [Description] | [Description] | [Fix] | [Date] |

### Should Fix (Major)

| ID | Issue | Impact | Recommendation | ETA |
|----|-------|--------|----------------|-----|
| M-001 | [Description] | [Description] | [Fix] | [Date] |
| M-002 | [Description] | [Description] | [Fix] | [Date] |

### Nice to Fix (Minor)

| ID | Issue | Impact | Recommendation | ETA |
|----|-------|--------|----------------|-----|
| N-001 | [Description] | [Description] | [Fix] | [Date] |
| N-002 | [Description] | [Description] | [Fix] | [Date] |

---

## ✅ Strengths

**What Axel Does Well:**

1. **[Strength 1]**
   - Evidence: [Description]
   - Impact: [Description]

2. **[Strength 2]**
   - Evidence: [Description]
   - Impact: [Description]

3. **[Strength 3]**
   - Evidence: [Description]
   - Impact: [Description]

---

## 📋 Action Plan

### Immediate Actions (This Week)

- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

### Short-term Actions (1-2 Weeks)

- [ ] [Action 3] - Owner: [Name] - Due: [Date]
- [ ] [Action 4] - Owner: [Name] - Due: [Date]

### Long-term Actions (1+ Month)

- [ ] [Action 5] - Owner: [Name] - Due: [Date]
- [ ] [Action 6] - Owner: [Name] - Due: [Date]

---

## 📈 Trends

### Quality Score Trend

| Review Date | Overall Score | Structure | Prompt | Execution | Enhancement |
|-------------|---------------|-----------|--------|-----------|-------------|
| YYYY-MM-DD | XX/100 | XX | XX | XX | XX |
| YYYY-MM-DD | XX/100 | XX | XX | XX | XX |
| YYYY-MM-DD | XX/100 | XX | XX | XX | XX |

### Issue Trend

| Review Date | Critical | Major | Minor | Total Open |
|-------------|----------|-------|-------|------------|
| YYYY-MM-DD | X | X | X | X |
| YYYY-MM-DD | X | X | X | X |
| YYYY-MM-DD | X | X | X | X |

---

## 🎯 Next Review

**Scheduled Date:** YYYY-MM-DD
**Focus Areas:**
- [Area 1]
- [Area 2]
- [Area 3]

**Reviewers:**
- [Name 1]
- [Name 2]

---

## 📝 Approvals

**Quality Assurance:**
- Name: ________________
- Signature: ________________
- Date: ________________

**Product Owner:**
- Name: ________________
- Signature: ________________
- Date: ________________

---

*Template for Axel quality reports - Fill in bracketed sections with actual data*
