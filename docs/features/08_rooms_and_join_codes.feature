# ============================================================================
# ROOMS & JOIN CODES
# Source: v2 server/RoomManager.ts + server/GameSession.ts (Decision D).
#
# This feature lands a DELIBERATE behavior change from the legacy build, which
# ran a single global game instance (see 01_lobby_and_match_flow). The modern
# server hosts multiple independent games as join-by-code rooms — one
# GameSession per room, with no shared state. Added per the modernization
# plan's principle 4 (behavior changes are explicit, with their own scenarios).
# ============================================================================

Feature: Rooms and Join Codes
  As a group of players
  I want to create or join a game by code
  So that many independent matches can run on one server without interfering

  Background:
    Given a server hosting multiple games as join-by-code rooms

  @core @rooms
  Scenario: Two players who share a code join the same room
    Given a player joins room "ABCD"
    When another player joins room "ABCD"
    Then both players are in the same room
    And the server is running exactly one room

  @core @rooms
  Scenario: Players with different codes are in independent rooms
    Given a player joins room "AAAA"
    And another player joins room "BBBB"
    Then the server is running exactly two rooms
    And each room has one player

  @core @rooms @isolation
  Scenario: A win in one room does not affect another room
    Given two independent rooms each with a match in progress
    When a win is resolved in the first room
    Then the first room has ended
    And the second room's match is still in progress

  @advanced @rooms
  Scenario: The same character can be claimed in two different rooms
    Given two independent rooms
    When a player in each room selects "teamBlue-queen"
    Then both selections succeed
