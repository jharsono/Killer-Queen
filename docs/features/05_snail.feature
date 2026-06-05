# ============================================================================
# THE SNAIL & SNAIL VICTORY
# Source: game.js (Snail, Worker.snailCheck, SnailCage)
# ============================================================================

Feature: The Snail and the Snail Win
  As a worker
  I want to ride and steer the snail toward my team's basket
  So that my team can win by snail

  Background:
    Given a match is in progress
    And the snail sits between the two team baskets

  # --------------------------------------------------------------------------
  # MOUNTING & STEERING
  # --------------------------------------------------------------------------

  @core @snail @collision
  Scenario: A worker mounts the unoccupied snail on contact
    Given the snail has no rider
    And a worker without the warrior upgrade
    When the worker overlaps the snail
    Then the worker becomes the snail's rider
    And the worker is positioned on the snail each tick

  @core @snail
  Scenario: A warrior cannot ride the snail
    Given a warrior overlapping the unoccupied snail
    When collision is evaluated
    Then the snail has no rider

  @core @snail
  Scenario Outline: A rider can only push the snail toward their own basket
    Given a "<team>" worker riding the snail
    When the worker pushes "<direction>"
    Then the snail moves "<result>"

    Examples:
      | team     | direction  | result            |
      | teamBlue | ArrowLeft  | left toward basket |
      | teamBlue | ArrowRight | not at all         |
      | teamGold | ArrowRight | right toward basket|
      | teamGold | ArrowLeft  | not at all         |

  @core @snail
  Scenario: The snail moves slowly
    Given a worker pushing the snail in their allowed direction
    When one tick passes
    Then the snail moves by 0.1 pixels

  @advanced @snail
  Scenario: A rider dismounts the snail by jumping
    Given a worker riding the snail
    When the worker jumps
    Then the worker is no longer the snail's rider
    And the worker is placed beside the snail

  # --------------------------------------------------------------------------
  # SWALLOWING
  # --------------------------------------------------------------------------

  @core @snail @combat
  Scenario: The ridden snail swallows an enemy worker that touches it
    Given a worker of one team riding the snail
    When an enemy worker touches the snail while it is not already swallowing
    Then the snail begins swallowing
    And the enemy worker is removed from play for 3000 ms

  @core @snail @combat
  Scenario: The snail cannot swallow again while already swallowing
    Given the snail is currently swallowing an enemy
    When another enemy worker touches the snail
    Then no new swallow begins until the 3000 ms swallow finishes

  @advanced @snail
  Scenario: Losing the rider frees the snail
    Given a worker riding the snail
    When that rider is killed
    Then the snail has no rider

  # --------------------------------------------------------------------------
  # SNAIL VICTORY
  # --------------------------------------------------------------------------

  @core @snail @victory
  Scenario: Riding the snail into a basket wins by snail
    Given a worker riding the snail toward a basket
    When the snail reaches the basket
    Then the server resolves a "win_snail" win for the rider's team

  @advanced @snail @victory @quirk
  Scenario: The snail win does not verify the basket belongs to the rider
    # QUIRK: the win fires on contact with any SnailCage and credits the
    # rider's team without checking the basket's own team. In practice a
    # rider can only steer toward their own basket, so this is latent.
    Given a worker riding the snail
    When the snail contacts any basket
    Then a "win_snail" win is credited to the rider's team
