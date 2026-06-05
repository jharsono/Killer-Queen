# ============================================================================
# BERRIES & ECONOMIC VICTORY
# Source: game.js (Berry, Worker.berryCheck, Goal)
# ============================================================================

Feature: Berries and the Economic Win
  As a worker
  I want to carry berries to my team's goals
  So that my team can win economically by filling every goal

  Background:
    Given a match is in progress
    And berries are scattered around the level

  # --------------------------------------------------------------------------
  # CARRYING BERRIES
  # --------------------------------------------------------------------------

  @core @economy @collision
  Scenario: A worker picks up a berry on contact
    Given a worker carrying no berry
    And an unclaimed berry on the ground
    When the worker overlaps the berry
    Then the worker is carrying that berry
    And the berry follows the worker's position each tick

  @core @economy
  Scenario: A worker may carry only one berry at a time
    Given a worker already carrying a berry
    When the worker overlaps a second unclaimed berry
    Then the worker keeps the original berry
    And the second berry remains unclaimed

  @core @economy
  Scenario: A warrior cannot pick up berries
    Given a warrior overlapping an unclaimed berry
    When collision is evaluated
    Then the warrior is not carrying the berry

  @advanced @economy @collision
  Scenario: A single berry is not claimed by two workers at once
    Given two workers contact the same unclaimed berry on the same tick
    When the berry pickup is resolved
    Then exactly one worker carries the berry
    And the duplicate pickup is rejected

  # --------------------------------------------------------------------------
  # DEPOSITING BERRIES
  # --------------------------------------------------------------------------

  @core @economy @collision
  Scenario: A worker deposits a carried berry into a same-team goal
    Given a worker carrying a berry
    And an empty goal belonging to the worker's team
    When the carried berry overlaps that goal
    Then the berry fills the goal
    And the worker is no longer carrying a berry

  @core @economy
  Scenario: A worker cannot deposit a berry into an enemy goal
    Given a worker carrying a berry
    And the only nearby goal belongs to the enemy team
    When the worker overlaps that goal
    Then the berry is not deposited

  @core @economy
  Scenario: A filled goal cannot accept a second berry
    Given a goal that already holds a berry
    When another carried berry overlaps that goal
    Then the goal still holds only its original berry

  # --------------------------------------------------------------------------
  # ECONOMIC VICTORY
  # --------------------------------------------------------------------------

  @core @economy @victory
  Scenario: Filling every team goal wins the game economically
    # FIDELITY: Authentic KQ fills a hive with a per-arena berry count; here
    # the threshold is "every goal element for the team holds a berry".
    Given every goal for the blue team holds a berry except one
    When a blue worker deposits a berry in the last empty blue goal
    Then the server resolves a "win_economic" win for the blue team
