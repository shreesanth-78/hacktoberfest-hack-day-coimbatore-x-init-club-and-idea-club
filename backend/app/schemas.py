"""Request and response models. These are the API contract in README.md "API Documentation"."""
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, StringConstraints

PlayerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
MessageText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Level(BaseModel):
    id: int
    title: str
    map: str
    checkpoint: bool
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
    player_id: Optional[str] = None  # from POST /api/players; enables progress and level locking


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


class MessageResponse(BaseModel):
    reply: str
    attempts_remaining: int
    status: Literal["in_progress", "won", "lost"]
    score: Optional[int] = None
    debrief: Optional[Debrief] = None
    restart_level_id: Optional[int] = None
    hint: Optional[str] = None


class PlayerCreated(BaseModel):
    player_id: str


class LevelProgress(BaseModel):
    level_id: int
    status: Literal["cleared", "unlocked", "locked"]
    best_score: Optional[int] = None


class Progress(BaseModel):
    player_id: str
    current_level_id: Optional[int] = None
    completed: bool
    campaign_score: int
    levels: list[LevelProgress]


class LeaderboardEntry(BaseModel):
    player_name: str
    score: int
    attempts_used: int


class Leaderboard(BaseModel):
    entries: list[LeaderboardEntry]


class Health(BaseModel):
    status: str
