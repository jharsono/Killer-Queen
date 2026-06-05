# ============================================================================
# QUEEN, EGGS & MILITARY VICTORY
# Source: game.js (Queen, Egg, Game.win)
# ============================================================================

Feature: The Queen, Eggs, and Military Victory
  As a team
  I want my queen to respawn from eggs until they run out
  So that the military win is decided by three queen kills

  Background:
    Given a match is in progress
    And each team starts with three eggs

  # --------------------------------------------------------------------------
  # QUEEN RESPAWN VIA EGGS
  # --------------------------------------------------------------------------

  @core @queen @lifecycle
  Scenario: The queen spawns from an egg at match start
    Given the blue team has three unhatched eggs
    When the match starts
    Then the blue queen spawns at an egg
    And that egg is hatched and removed from play
    And two unhatched blue eggs remain

  @core @queen @lifecycle
  Scenario: A killed queen respawns while eggs remain
    Given the blue queen is killed
    And the blue team still has at least one unhatched egg
    When the queen respawns
    Then she reappears at the next egg
    And that egg is hatched

  # --------------------------------------------------------------------------
  # MILITARY VICTORY
  # --------------------------------------------------------------------------

  @core @queen @victory
  Scenario: Killing the queen with no eggs left wins militarily
    # With one egg hatched at spawn, three further kills exhaust the eggs:
    # the third kill resolves the military win.
    Given the blue team has no unhatched eggs remaining
    When the blue queen is killed by a gold attacker
    Then the server resolves a "win_military" win for the gold team

  @advanced @queen @victory
  Scenario Outline: The military win takes three queen kills
    Given a fresh match with three eggs per team
    When the enemy queen is killed <kills> times
    Then a military win is "<outcome>"

    Examples:
      | kills | outcome      |
      | 2     | not resolved |
      | 3     | resolved     |

  # --------------------------------------------------------------------------
  # GAME-OVER PRESENTATION
  # --------------------------------------------------------------------------

  @core @victory @lifecycle
  Scenario: A resolved win notifies clients with focus for the camera
    Given any win condition is resolved
    When the server emits "game_win"
    Then the payload includes the win type, the winning team, and a focus position
    And the client zooms the game-over view onto that focus position
