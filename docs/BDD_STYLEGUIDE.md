# BDD/Gherkin Styleguide for TAHO

Standards for writing Gherkin feature files in the TAHO project.

---

## File Organization

### Directory Structure
```
docs/features/{feature-name}/
├── 01_{aspect}.feature          # Numbered, ordered by logical flow
├── 02_{aspect}.feature
└── README.md                     # Overview, usage, links
```

### Rules
- **Naming**: `snake_case`, numbered prefixes (`01_`, `02_`)
- **Size**: 50-200 lines per file (~5-15 scenarios)
- **Split when**: File >200 lines, >15 scenarios, or distinct functional areas
- **README required**: Every feature directory needs overview and tag reference

---

## Feature Structure

```gherkin
Feature: {Descriptive Title}
  As a {role}
  I want to {capability}
  So that {business value}

  Background:
    Given {common setup for ALL scenarios}
    And {only include if needed by every scenario}

  @tag1 @tag2
  Scenario: {Action-oriented description}
    Given {preconditions - declarative}
    When {action - one per scenario}
    Then {expected outcome - specific}
    And {additional assertions}
```

### Key Principles
- **Feature**: Title case, clear user story
- **Background**: Only for steps needed by ALL scenarios (3-5 steps max)
- **Given**: Declare state ("service is running"), not actions ("start service")
- **When**: One action per scenario, use And for related steps
- **Then**: Specific, verifiable outcomes with exact values

---

## Tag Conventions

### Standard Tags

| Category | Tags | Usage |
|----------|------|-------|
| Priority | `@core`, `@advanced` | Must-pass vs optional |
| Environment | `@local`, `@remote`, `@fabric` | Where it runs |
| Type | `@native`, `@wasm` | Implementation type |
| Aspect | `@validation`, `@error`, `@lifecycle`, `@config` | Test focus |
| Performance | `@performance`, `@slow` | Timing/speed |

### Tag Rules
1. **Use 2-4 tags per scenario**
2. **Order consistently**: Priority → Environment → Type → Aspect
   ```gherkin
   @core @local @native @validation          # Good
   @validation @native @local @core          # Bad
   ```
3. **Tag scenarios, not features**
4. **Add feature-specific tags as needed** (e.g., `@api`, `@cli`, `@storage`), but prefer standard tags when possible

### Filtering Examples
```bash
cucumber --tags "@core and @local"           # Core local tests only
cucumber --tags "@error"                     # All error handling
cucumber --tags "not @fabric and not @slow"  # Fast local tests
```

---

## Writing Scenarios

### Good vs Bad Examples

❌ **Bad - Vague and procedural:**
```gherkin
Scenario: Test the service
  Given we start everything
  When I click the button
  Then it works
```

✅ **Good - Specific and declarative:**
```gherkin
@core @local @native
Scenario: Successfully invoke local native txt2img service
  Given the "txt2img-demo" service is registered in native_services
  When a client sends a POST request to "/api/services/taho/txt2img-demo/invoke/generate"
  Then the service should return HTTP 200
  And the response should contain field "image_url"
```

### Common Patterns

**Service state:**
```gherkin
Given the "{service}" service is available locally
Given the "{service}" service is NOT registered
```

**HTTP requests:**
```gherkin
When a client sends a POST request to "{endpoint}"
When a client sends a POST request to "{endpoint}" with:
  """json
  {"key": "value"}
  """
```

**Assertions:**
```gherkin
Then the service should return HTTP {code}
Then the response should contain {field}
Then the error message should be "{exact_text}"
```

---

## Data Formats

### Doc Strings (for JSON/TOML/YAML)
```gherkin
When a client sends a request with:
  """json
  {
    "prompt": "A test",
    "width": 512
  }
  """
```

### Data Tables
```gherkin
Then the response should contain:
  | field           | value                     |
  | image_url       | matches /^image_/         |
  | metadata.model  | StableDiffusionXL-Onnx    |
```

### Scenario Outlines (for variations)
```gherkin
Scenario Outline: Generate with different models
  When a client requests generation with model "<model>"
  Then the metadata should indicate "<model>" was used

  Examples:
    | model                         |
    | StableDiffusionXL-Onnx        |
    | StableDiffusionTurbo-Onnx     |
    | Qwen3-0.6B-Eonnx              |
```

**Use when**: Testing same behavior with different inputs (5-10 variations)
**Don't use when**: Only 1-2 examples (write separate scenarios instead)

---

## Documentation

### Comments
```gherkin
# ============================================================================
# REMOTE SERVICE INVOCATION
# ============================================================================

@fabric @remote
Scenario: ...
```

**Use sparingly**: Explain WHY, not WHAT (scenario names should be clear)

### README Template
```markdown
# {Feature} Features

## Overview
Brief description of what this feature does.

## Feature Files
- **01_file.feature**: What it covers, key scenarios
- **02_file.feature**: What it covers, key scenarios

## Tag Reference
{Table of tags used in this feature}

## Usage Examples
{How to run specific subsets}

## Related Files
- Implementation: {link}
- Routes: {link}
```

---

## Anti-Patterns

❌ **Implementation details:**
```gherkin
Given the database connection pool has 10 connections
And the Redis cache is warmed up
```

❌ **Vague assertions:**
```gherkin
Then it should work
Then the result is correct
```

❌ **Coupled scenarios:**
```gherkin
Scenario: Create user "john"
Scenario: Update the user  # Which user? Depends on previous!
```

✅ **Write behavior, be specific, keep independent:**
```gherkin
Given the service is running
Then the service should return HTTP 200
Scenario: Update user "jane" { Given user "jane" exists... }
```

---

## Style Rules

- **Language**: Business terminology, not technical jargon
- **Tense**: Present tense ("service is", not "service was")
- **Voice**: Active voice ("client sends", not "request is sent")
- **Specificity**: Exact values, error messages, status codes
- **Indentation**: 2 spaces per level
- **Line length**: Target 80 chars, max 120

---

## AI Agent Checklist

When generating feature files:

1. ✅ **Ask about**: User roles, business value, edge cases, performance expectations
2. ✅ **Organize**: By aspect (validation, errors, lifecycle), not chronologically
3. ✅ **Split**: Keep files 50-200 lines, split large features into multiple files
4. ✅ **Tag**: 2-4 tags per scenario, follow ordering convention
5. ✅ **Write declaratively**: WHAT happens, not HOW (avoid implementation)
6. ✅ **Independent scenarios**: Each runnable alone, no execution order dependency
7. ✅ **Specific assertions**: Include exact error messages, status codes, patterns
8. ✅ **Document**: Section comments, comprehensive README, link to implementation

---

## Quick Reference

```gherkin
Feature: Clear Title
  As a {role}
  I want {capability}
  So that {value}

  Background:
    Given common setup for all scenarios

  # ============================================================================
  # SECTION NAME
  # ============================================================================

  @priority @environment @type @aspect
  Scenario: Action-oriented specific description
    Given declarative precondition
    And another precondition
    When single action happens
    Then specific verifiable outcome
    And additional assertion
    But should NOT have {something}

  @tags
  Scenario Outline: Variation testing
    When client uses "<param>"
    Then result should be "<expected>"

    Examples:
      | param   | expected |
      | value1  | result1  |
      | value2  | result2  |
```

---

**Version**: v1.0 (2025-10-27)
