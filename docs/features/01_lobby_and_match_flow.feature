# ============================================================================
# LOBBY & MATCH FLOW
# Source: app.js (socket wiring) + game.js (Game class event handlers)
# Documents CURRENT behavior. Lines tagged @quirk note implementation oddities.
# ============================================================================

Feature: Lobby and Match Flow
  As a player connecting to a Killer Queen server
  I want to pick a character, ready up, and have a match start
  So that a full game of up to ten players can begin and reset cleanly

  Background:
    Given the server is running a single global game instance
    And each connected browser is one user with an empty key state

  # --------------------------------------------------------------------------
  # CHARACTER SELECTION
  # --------------------------------------------------------------------------

  @core @lobby @lifecycle
  Scenario: A connecting user receives the current lobby state
    Given no match is in progress
    When a user connects to the server
    Then the server emits a "menu_update" to that user
    And the menu shows which characters are already taken

  @core @lobby @validation
  Scenario: A user claims an available character
    Given the character "teamBlue-queen" is not taken
    When the user selects "teamBlue-queen"
    Then the user's toonId becomes "teamBlue-queen"
    And the user's ready flag is reset to false
    And the server emits a "menu_update" to all users without a character

  @core @lobby @validation @error
  Scenario: A user cannot claim a character another user already holds
    Given another user already holds "teamGold-worker0"
    When the user selects "teamGold-worker0"
    Then the server emits an "alert" with text "This character is already taken"
    And the user's toonId remains unchanged

  # --------------------------------------------------------------------------
  # READY-UP & COUNTDOWN
  # --------------------------------------------------------------------------

  @core @lobby @lifecycle
  Scenario: The match starts once every connected user has a character and is ready
    Given every connected user has selected a character
    And no match is in progress
    When the last user readies up
    Then the server dispatches "game_countdown"
    And after the countdown the server dispatches "game_start"

  @core @lobby @quirk
  Scenario: The countdown is effectively instant
    # FIDELITY: GAME_START_DELAY is 0, so the displayed countdown time is 0
    # and the match starts on the same tick the countdown begins.
    Given every connected user is ready
    When the countdown begins
    Then the emitted countdown time is 0
    And "game_start" is dispatched immediately

  @advanced @lobby @lifecycle
  Scenario: A late-readying user quick-joins a match already in progress
    Given a match is already in progress
    When a user readies up
    Then the server emits "game_start" only to that user
    And the countdown is not restarted for the other players

  # --------------------------------------------------------------------------
  # MATCH END & RESET
  # --------------------------------------------------------------------------

  @core @lobby @lifecycle
  Scenario: A win ends the match and schedules a reset
    Given a match is in progress
    When the server resolves a win condition
    Then the server emits "game_win" with the win type, team, and focus element
    And the server dispatches "game_reset" after 8000 ms

  @core @lobby @lifecycle
  Scenario: A reset returns all users to the lobby
    Given a match has ended
    When "game_reset" is dispatched
    Then the server emits "game_reset" to all users
    And the game loop is stopped
    And every user's toonId is cleared

  @advanced @lobby @lifecycle
  Scenario: The game resets a short time after the last user disconnects
    Given exactly one user is connected
    When that user disconnects
    Then the server dispatches "game_reset" after 10000 ms

  @advanced @lobby @lifecycle
  Scenario: Remaining users see an updated lobby when one player disconnects
    Given two or more users are connected
    When one user disconnects
    Then that user's character is released
    And the server emits "menu_update" to the remaining users
