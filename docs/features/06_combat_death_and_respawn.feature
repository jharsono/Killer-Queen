# ============================================================================
# COMBAT, DEATH & RESPAWN
# Source: game.js (Toon.attack/attacked/Invulnerable, Worker, Queen collisions)
# ============================================================================

Feature: Combat, Death, and Respawn
  As a player with a sword (warrior or queen)
  I want to kill enemies I am facing
  So that I can clear lanes and threaten the enemy queen

  Background:
    Given a match is in progress

  # --------------------------------------------------------------------------
  # ATTACKING
  # --------------------------------------------------------------------------

  @core @combat @collision
  Scenario: A warrior auto-attacks an enemy it is facing
    Given a warrior facing an enemy worker within contact range
    When collision is evaluated
    Then the warrior performs an attack
    And the attack stays active for 200 ms

  @core @combat
  Scenario: A plain worker cannot attack
    Given a worker without the warrior upgrade facing an enemy
    When collision is evaluated
    Then no attack is performed

  @core @combat @collision
  Scenario: An attacking warrior kills an enemy it faces
    Given a warrior with an active attack facing an enemy worker
    When the two overlap
    Then the enemy worker is killed

  # --------------------------------------------------------------------------
  # DEATH EFFECTS
  # --------------------------------------------------------------------------

  @core @combat @lifecycle
  Scenario: A killed worker drops its berry and snail
    Given a worker carrying a berry and riding the snail
    When the worker is killed
    Then the worker is no longer carrying a berry
    And the worker is no longer the snail's rider

  @core @combat @lifecycle
  Scenario: A killed warrior respawns as a plain worker
    Given a warrior is killed
    When the warrior respawns
    Then it returns as a worker with no warrior upgrade
    And its speed returns to 2

  @core @combat @lifecycle
  Scenario: A freshly spawned toon is briefly invulnerable
    Given a toon has just spawned or respawned
    When it is attacked within 3000 ms of spawning
    Then the attack has no effect

  @core @combat @lifecycle
  Scenario: An invulnerable or inactive toon ignores attacks
    Given a toon that is currently invulnerable
    When an enemy attack overlaps it
    Then the toon is not killed

  # --------------------------------------------------------------------------
  # QUEEN VS QUEEN
  # --------------------------------------------------------------------------

  @advanced @combat @queen @collision
  Scenario: The higher queen wins a head-on clash
    Given two enemy queens both attacking and facing each other
    When they overlap
    Then the lower-positioned queen is killed
    And the higher-positioned queen survives

  @advanced @combat @queen @collision
  Scenario: A queen stabbed from behind is killed
    Given an attacking queen facing an enemy queen
    And the enemy queen is not facing back
    When they overlap
    Then the enemy queen is killed
