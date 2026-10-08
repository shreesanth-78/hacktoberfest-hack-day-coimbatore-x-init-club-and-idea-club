"""Request and response models. These are the API contract in README.md "API Documentation"."""
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, StringConstraints

PlayerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
MessageText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Level(BaseModel):
    id: int
    title: str
    kingdom: int
    kingdom_name: str
    domain: str
    position: int
    checkpoint: bool
    boss: bool
    difficulty: str
    character: str
    setting: str
    intro: str
    opening: str
    max_attempts: int


class LevelList(BaseModel):
    levels: list[Level]


class CreateSessionRequest(BaseModel):
    level_id: int
    player_name: PlayerName


class SessionCreated(BaseModel):
    session_id: str
    level_id: int
    attempts_remaining: int


class MessageRequest(BaseModel):
    message: MessageText


class Debrief(BaseModel):
    title: str
    technique: str
    vulnerability: str
    defence: str


class Bonuses(BaseModel):
    checkpoint: int
    kingdom: int


class CampaignOutcome(BaseModel):
    """Sent with a message response when a campaign level ends."""
    outcome: Literal["won", "lost"]
    level_score: int
    bonuses: Bonuses
    total_score: int
    next_level_id: Optional[int] = None
    respawn: bool
    checkpoint_reached: bool
    kingdom_cleared: bool
    campaign_completed: bool


class MessageResponse(BaseModel):
    reply: str
    attempts_remaining: int
    status: Literal["in_progress", "won", "lost"]
    score: Optional[int] = None
    debrief: Optional[Debrief] = None
    hint: Optional[str] = None
    campaign: Optional[CampaignOutcome] = None


class CreateCampaignRequest(BaseModel):
    player_name: PlayerName


class CampaignState(BaseModel):
    campaign_id: str
    player_name: str
    status: Literal["in_progress", "completed"]
    current_level_id: int
    current_kingdom: int
    checkpoint_level_id: Optional[int] = None
    cleared_level_ids: list[int]
    total_score: int


class CampaignSession(SessionCreated):
    level: Level


class CampaignLeaderboardEntry(BaseModel):
    player_name: str
    total_score: int
    status: Literal["in_progress", "completed"]
    levels_cleared: int


class CampaignLeaderboard(BaseModel):
    entries: list[CampaignLeaderboardEntry]


class LeaderboardEntry(BaseModel):
    player_name: str
    score: int
    attempts_used: int


class Leaderboard(BaseModel):
    entries: list[LeaderboardEntry]


class Health(BaseModel):
    status: str


class AIHealth(BaseModel):
    status: str
    mode: Literal["stub", "ollama"]
    model: Optional[str] = None
    host: Optional[str] = None
