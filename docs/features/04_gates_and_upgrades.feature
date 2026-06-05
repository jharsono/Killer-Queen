# ============================================================================
# GATES & UPGRADES (SHRINES)
# Source: game.js (Shrine, ShrineSpeed, ShrineWarrior, Worker.gainSpeed/gainWarrior)
# In this codebase "gates" are modeled as Shrine elements.
# ============================================================================

Feature: Gates and Worker Upgrades
  As a worker
  I want to spend a berry at a gate
  So that I can become a warrior or gain speed for my team

  Background:
    Given a match is in progress
    And the level contains a speed gate and a warrior gate per team

  # --------------------------------------------------------------------------
  # USING A GATE
  # --------------------------------------------------------------------------

  @core @gates @upgrade
  Scenario: A worker with a berry activates a gate by standing in its center
    Given a worker carrying a berry
    And the gate is not currently in use
    When the worker stands in the middle of the gate
    Then the gate powers up the worker
    And the carried berry is consumed

  @core @gates
  Scenario: A worker without a berry cannot activate a gate
    Given a worker carrying no berry
    When the worker stands in a gate
    Then no power-up is granted

  @core @gates @lifecycle
  Scenario: A gate is on cooldown briefly after use
    # The gate's in-use flag clears after SHRINE_POWER_UP_DELAY (2000 ms).
    Given a gate that was just used
    When another worker with a berry enters within 2000 ms
    Then the gate does not power up the second worker

  # --------------------------------------------------------------------------
  # WARRIOR GATE
  # --------------------------------------------------------------------------

  @core @gates @upgrade @combat
  Scenario: A warrior gate turns a worker into a warrior
    Given a worker carrying a berry at a warrior gate
    When the gate powers up the worker
    Then the worker becomes a warrior
    And the warrior's speed becomes 3
    And the warrior can attack and fly but can no longer carry berries

  @advanced @gates @upgrade @combat
  Scenario: A speed-upgraded worker becomes a faster warrior
    Given a worker that already has the speed upgrade
    When the worker is converted at a warrior gate
    Then the warrior's speed becomes 4

  # --------------------------------------------------------------------------
  # SPEED GATE
  # --------------------------------------------------------------------------

  @core @gates @upgrade
  Scenario: A speed gate makes a worker move faster
    Given a worker carrying a berry at a speed gate
    When the gate powers up the worker
    Then the worker gains the speed upgrade
    And the worker's movement speed becomes 3

  @core @gates @upgrade @fidelity-gap
  Scenario: A speed upgrade does NOT currently speed up snail riding
    # FIDELITY GAP: Authentic KQ speed gates make a rider push the snail
    # faster. Here the snail always moves at SNAIL_SPEED regardless of upgrade.
    Given a speed-upgraded worker riding the snail
    When the worker pushes the snail
    Then the snail still moves at its base speed of 0.1 per tick

  @advanced @gates @upgrade
  Scenario: A worker cannot stack the same speed upgrade twice
    Given a worker that already has the speed upgrade
    When the worker enters a speed gate again
    Then the speed gate check is skipped for that worker

  # --------------------------------------------------------------------------
  # QUEEN GATE CONVERSION
  # --------------------------------------------------------------------------

  @core @gates @queen
  Scenario: A queen converts a gate to her team's affiliation
    Given a gate affiliated with the gold team
    When the blue queen touches the gate
    Then the gate's affiliation changes to the blue team
