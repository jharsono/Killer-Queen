# ============================================================================
# MOVEMENT & PHYSICS
# Source: game.js (Toon, Worker, Queen movement + Game.loop input handling)
# All units are server-simulated at ~60fps; clients only send held keys.
# ============================================================================

Feature: Toon Movement and Physics
  As a player controlling a toon
  I want responsive horizontal movement, jumping, and gravity
  So that I can traverse the level and platforms predictably

  Background:
    Given a match is in progress
    And the level is 800 wide by 600 tall

  # --------------------------------------------------------------------------
  # HORIZONTAL MOVEMENT
  # --------------------------------------------------------------------------

  @core @movement
  Scenario Outline: A toon moves horizontally at its current speed each tick
    Given a "<unit>" with no upgrades
    When the "<direction>" key is held for one tick
    Then the toon's left position changes by <delta> pixels
    And the toon faces "<facing>"

    Examples:
      | unit    | direction  | delta | facing          |
      | worker  | ArrowRight |  2    | direction-right |
      | worker  | ArrowLeft  | -2    | direction-left  |
      | queen   | ArrowRight |  3    | direction-right |

  @core @movement @quirk
  Scenario: A toon wraps around the horizontal edges of the level
    # The level repeats: walking off one side reappears on the other.
    Given a toon at the right edge of the level
    When the toon moves past the right boundary
    Then the toon reappears at the left side of the level

  @core @movement
  Scenario: A grounded toon cannot duck downward
    Given a grounded worker
    When the ArrowDown key is held
    Then the toon does not move downward

  @core @movement
  Scenario: An airborne toon can move downward
    Given an airborne worker
    When the ArrowDown key is held for one tick
    Then the toon's top position increases by its speed
    And the toon faces "direction-down"

  # --------------------------------------------------------------------------
  # GRAVITY & GROUND
  # --------------------------------------------------------------------------

  @core @movement @physics
  Scenario: Gravity accelerates a falling toon up to a terminal rate
    Given an airborne toon with zero downward acceleration
    When several ticks pass without input
    Then downward acceleration increases by 0.2 each tick
    And acceleration is capped at 4 per tick

  @core @movement @physics
  Scenario: Landing on ground halts downward acceleration
    Given a toon falling toward a ground surface
    When the toon's feet reach the ground
    Then the toon is marked grounded
    And the toon's downward acceleration is reset to zero

  @core @movement @physics
  Scenario: Ground and walls block a toon's movement
    Given a toon adjacent to a wall
    When the toon moves into the wall
    Then the toon is pushed back out of the wall surface

  # --------------------------------------------------------------------------
  # JUMPING & FLIGHT
  # --------------------------------------------------------------------------

  @core @movement @physics
  Scenario: A jump applies an upward impulse and cannot be held
    Given a grounded worker
    When the ArrowUp key is held across multiple ticks
    Then the toon receives an upward impulse on the first tick only
    And the jump key is consumed each tick so it cannot repeat-fire

  @core @movement @physics
  Scenario: A worker can only jump from the ground
    Given an airborne worker that is not riding the snail
    When the ArrowUp key is pressed
    Then the worker does not jump

  @advanced @movement @physics
  Scenario: A warrior can fly by jumping while airborne
    Given an airborne warrior
    When the ArrowUp key is pressed
    Then the warrior receives an upward impulse

  @advanced @movement @physics @queen
  Scenario: A queen can always fly
    Given an airborne queen
    When the ArrowUp key is pressed
    Then the queen receives an upward impulse
